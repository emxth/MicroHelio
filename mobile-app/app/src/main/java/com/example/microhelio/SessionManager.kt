package com.example.microhelio

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import com.example.microhelio.models.LoginResponse
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

class SessionManager(context: Context) : SQLiteOpenHelper(context, DATABASE_NAME, null, DATABASE_VERSION) {

    companion object {
        private const val DATABASE_NAME = "session.db"
        private const val DATABASE_VERSION = 1
        private const val TABLE_SESSION = "local_session"

        private const val COLUMN_ACCOUNT_ID = "accountId"
        private const val COLUMN_ACCOUNT_IDENTIFIER = "accountIdentifier"
        private const val COLUMN_FULL_NAME = "fullName"
        private const val COLUMN_ROLE = "role"
        private const val COLUMN_TOKEN = "token"
        private const val COLUMN_EXPIRES_AT = "expiresAtUtc"
    }

    override fun onCreate(db: SQLiteDatabase) {
        val createTable = ("CREATE TABLE " + TABLE_SESSION + "("
                + COLUMN_ACCOUNT_ID + " TEXT PRIMARY KEY,"
                + COLUMN_ACCOUNT_IDENTIFIER + " TEXT,"
                + COLUMN_FULL_NAME + " TEXT,"
                + COLUMN_ROLE + " TEXT,"
                + COLUMN_TOKEN + " TEXT,"
                + COLUMN_EXPIRES_AT + " TEXT" + ")")
        db.execSQL(createTable)
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        db.execSQL("DROP TABLE IF EXISTS $TABLE_SESSION")
        onCreate(db)
    }

    fun saveSession(loginResponse: LoginResponse) {
        val db = this.writableDatabase
        db.execSQL("DELETE FROM $TABLE_SESSION") // Keep only one active session

        val values = ContentValues().apply {
            put(COLUMN_ACCOUNT_ID, loginResponse.accountId)
            put(COLUMN_ACCOUNT_IDENTIFIER, loginResponse.accountIdentifier)
            put(COLUMN_FULL_NAME, loginResponse.fullName)
            put(COLUMN_ROLE, loginResponse.role)
            put(COLUMN_TOKEN, loginResponse.token)
            put(COLUMN_EXPIRES_AT, loginResponse.expiresAtUtc)
        }
        db.insert(TABLE_SESSION, null, values)
        db.close()
    }

    fun getSession(): LoginResponse? {
        val db = this.readableDatabase
        val cursor = db.rawQuery("SELECT * FROM $TABLE_SESSION", null)
        var session: LoginResponse? = null
        if (cursor.moveToFirst()) {
            session = LoginResponse(
                accountId = cursor.getString(cursor.getColumnIndexOrThrow(COLUMN_ACCOUNT_ID)),
                accountIdentifier = cursor.getString(cursor.getColumnIndexOrThrow(COLUMN_ACCOUNT_IDENTIFIER)),
                fullName = cursor.getString(cursor.getColumnIndexOrThrow(COLUMN_FULL_NAME)),
                role = cursor.getString(cursor.getColumnIndexOrThrow(COLUMN_ROLE)),
                token = cursor.getString(cursor.getColumnIndexOrThrow(COLUMN_TOKEN)),
                expiresAtUtc = cursor.getString(cursor.getColumnIndexOrThrow(COLUMN_EXPIRES_AT))
            )
        }
        cursor.close()
        db.close()
        return session
    }

    fun updateFullName(newName: String) {
        val db = this.writableDatabase
        val values = ContentValues().apply {
            put(COLUMN_FULL_NAME, newName)
        }
        // Since there is only one session row, we can just update without WHERE clause
        db.update(TABLE_SESSION, values, null, null)
        db.close()
    }

    fun clearSession() {
        val db = this.writableDatabase
        db.execSQL("DELETE FROM $TABLE_SESSION")
        db.close()
    }

    fun isSessionValid(): Boolean {
        val session = getSession() ?: return false
        try {
            val format = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
            format.timeZone = TimeZone.getTimeZone("UTC")
            val expirationDate: Date? = format.parse(session.expiresAtUtc)
            
            // Fallback for different date formats if needed
            if (expirationDate == null) {
                val format2 = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US)
                format2.timeZone = TimeZone.getTimeZone("UTC")
                val expDate2 = format2.parse(session.expiresAtUtc)
                return expDate2 != null && expDate2.after(Date())
            }

            return expirationDate.after(Date())
        } catch (e: Exception) {
            e.printStackTrace()
            // Try simpler ISO-8601 parsing if standard fails
            try {
                val format = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US)
                format.timeZone = TimeZone.getTimeZone("UTC")
                val expirationDate: Date? = format.parse(session.expiresAtUtc)
                return expirationDate != null && expirationDate.after(Date())
            } catch (ex: Exception) {
                ex.printStackTrace()
                return false
            }
        }
    }
}

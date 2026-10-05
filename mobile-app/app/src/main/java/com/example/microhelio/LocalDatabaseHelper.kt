package com.example.microhelio

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import org.json.JSONObject

class LocalDatabaseHelper(context: Context) : SQLiteOpenHelper(context, DATABASE_NAME, null, DATABASE_VERSION) {

    companion object {
        private const val DATABASE_NAME = "microhelio_local.db"
        private const val DATABASE_VERSION = 1

        // Table 1: LOCAL_SESSION
        const val TABLE_LOCAL_SESSION = "LOCAL_SESSION"
        const val COL_SESSION_ID = "id"
        const val COL_SESSION_SERVER_ID = "serverId"
        const val COL_SESSION_NIC = "nic"
        const val COL_SESSION_USERNAME = "username"
        const val COL_SESSION_ROLE = "role"
        const val COL_SESSION_FULL_NAME = "fullName"
        const val COL_SESSION_AUTH_TOKEN = "authToken"
        const val COL_SESSION_TOKEN_EXPIRY = "tokenExpiry"
        const val COL_SESSION_IS_ACTIVE = "isActive"
        const val COL_SESSION_CREATED_AT = "createdAt"

        // Table 2: CACHED_NODE
        const val TABLE_CACHED_NODE = "CACHED_NODE"
        const val COL_NODE_ID = "id"
        const val COL_NODE_CODE = "nodeCode"
        const val COL_NODE_NAME = "name"
        const val COL_NODE_LATITUDE = "latitude"
        const val COL_NODE_LONGITUDE = "longitude"
        const val COL_NODE_ADDRESS = "address"
        const val COL_NODE_CAPACITY = "capacityKWh"
        const val COL_NODE_AVAIL_SLOTS = "availableBatterySlots"
        const val COL_NODE_TOTAL_SLOTS = "totalBatterySlots"
        const val COL_NODE_IS_ACTIVE = "isActive"
        const val COL_NODE_LAST_SYNCED = "lastSynced"

        // Table 3: CACHED_RESERVATION
        const val TABLE_CACHED_RESERVATION = "CACHED_RESERVATION"
        const val COL_RES_ID = "id"
        const val COL_RES_CODE = "reservationCode"
        const val COL_RES_PROSUMER_NIC = "prosumerNic"
        const val COL_RES_NODE_ID = "nodeId"
        const val COL_RES_NODE_NAME = "nodeName"
        const val COL_RES_SLOT_ID = "slotId"
        const val COL_RES_TYPE = "reservationType"
        const val COL_RES_DATE = "scheduledDate"
        const val COL_RES_START_TIME = "scheduledStartTime"
        const val COL_RES_END_TIME = "scheduledEndTime"
        const val COL_RES_CAPACITY = "requestedCapacityKWh"
        const val COL_RES_STATUS = "status"
        const val COL_RES_QR_DATA = "qrCodeData"
        const val COL_RES_CREATED_AT = "createdAt"
        const val COL_RES_LAST_SYNCED = "lastSynced"

        // Table 4: CACHED_TRANSACTION
        const val TABLE_CACHED_TRANSACTION = "CACHED_TRANSACTION"
        const val COL_TRX_ID = "id"
        const val COL_TRX_CODE = "transactionCode"
        const val COL_TRX_RES_ID = "reservationId"
        const val COL_TRX_PROSUMER_NIC = "prosumerNic"
        const val COL_TRX_NODE_ID = "nodeId"
        const val COL_TRX_NODE_NAME = "nodeName"
        const val COL_TRX_ENERGY_KWH = "energyTransferredKWh"
        const val COL_TRX_STATUS = "transactionStatus"
        const val COL_TRX_COMPLETED_AT = "completedAt"
        const val COL_TRX_LAST_SYNCED = "lastSynced"
    }

    override fun onCreate(db: SQLiteDatabase) {
        val createSessionTable = """
            CREATE TABLE $TABLE_LOCAL_SESSION (
                $COL_SESSION_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                $COL_SESSION_SERVER_ID TEXT,
                $COL_SESSION_NIC TEXT,
                $COL_SESSION_USERNAME TEXT,
                $COL_SESSION_ROLE TEXT,
                $COL_SESSION_FULL_NAME TEXT,
                $COL_SESSION_AUTH_TOKEN TEXT,
                $COL_SESSION_TOKEN_EXPIRY INTEGER,
                $COL_SESSION_IS_ACTIVE INTEGER DEFAULT 1,
                $COL_SESSION_CREATED_AT INTEGER
            )
        """.trimIndent()

        val createNodeTable = """
            CREATE TABLE $TABLE_CACHED_NODE (
                $COL_NODE_ID TEXT PRIMARY KEY,
                $COL_NODE_CODE TEXT,
                $COL_NODE_NAME TEXT,
                $COL_NODE_LATITUDE REAL,
                $COL_NODE_LONGITUDE REAL,
                $COL_NODE_ADDRESS TEXT,
                $COL_NODE_CAPACITY REAL,
                $COL_NODE_AVAIL_SLOTS INTEGER,
                $COL_NODE_TOTAL_SLOTS INTEGER,
                $COL_NODE_IS_ACTIVE INTEGER DEFAULT 1,
                $COL_NODE_LAST_SYNCED INTEGER
            )
        """.trimIndent()

        val createReservationTable = """
            CREATE TABLE $TABLE_CACHED_RESERVATION (
                $COL_RES_ID TEXT PRIMARY KEY,
                $COL_RES_CODE TEXT,
                $COL_RES_PROSUMER_NIC TEXT,
                $COL_RES_NODE_ID TEXT,
                $COL_RES_NODE_NAME TEXT,
                $COL_RES_SLOT_ID TEXT,
                $COL_RES_TYPE TEXT,
                $COL_RES_DATE TEXT,
                $COL_RES_START_TIME TEXT,
                $COL_RES_END_TIME TEXT,
                $COL_RES_CAPACITY REAL,
                $COL_RES_STATUS TEXT,
                $COL_RES_QR_DATA TEXT,
                $COL_RES_CREATED_AT INTEGER,
                $COL_RES_LAST_SYNCED INTEGER
            )
        """.trimIndent()

        val createTransactionTable = """
            CREATE TABLE $TABLE_CACHED_TRANSACTION (
                $COL_TRX_ID TEXT PRIMARY KEY,
                $COL_TRX_CODE TEXT,
                $COL_TRX_RES_ID TEXT,
                $COL_TRX_PROSUMER_NIC TEXT,
                $COL_TRX_NODE_ID TEXT,
                $COL_TRX_NODE_NAME TEXT,
                $COL_TRX_ENERGY_KWH REAL,
                $COL_TRX_STATUS TEXT,
                $COL_TRX_COMPLETED_AT INTEGER,
                $COL_TRX_LAST_SYNCED INTEGER
            )
        """.trimIndent()

        db.execSQL(createSessionTable)
        db.execSQL(createNodeTable)
        db.execSQL(createReservationTable)
        db.execSQL(createTransactionTable)
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        db.execSQL("DROP TABLE IF EXISTS $TABLE_LOCAL_SESSION")
        db.execSQL("DROP TABLE IF EXISTS $TABLE_CACHED_NODE")
        db.execSQL("DROP TABLE IF EXISTS $TABLE_CACHED_RESERVATION")
        db.execSQL("DROP TABLE IF EXISTS $TABLE_CACHED_TRANSACTION")
        onCreate(db)
    }

    // --- Helper CRUD for CACHED_TRANSACTION ---
    fun saveOrUpdateTransaction(trxObj: JSONObject) {
        val db = writableDatabase
        val values = ContentValues().apply {
            val id = trxObj.optString("id", trxObj.optString("_id"))
            put(COL_TRX_ID, id)
            put(COL_TRX_CODE, trxObj.optString("transactionCode", "TRX-N/A"))
            put(COL_TRX_RES_ID, trxObj.optString("reservationId", ""))
            put(COL_TRX_PROSUMER_NIC, trxObj.optString("prosumerNic", ""))
            put(COL_TRX_NODE_ID, trxObj.optString("nodeId", ""))
            put(COL_TRX_NODE_NAME, trxObj.optString("nodeName", "Microgrid Station"))
            put(COL_TRX_ENERGY_KWH, trxObj.optDouble("energyTransferredKWh", 0.0))
            put(COL_TRX_STATUS, trxObj.optString("transactionStatus", "Initiated"))
            put(COL_TRX_COMPLETED_AT, System.currentTimeMillis())
            put(COL_TRX_LAST_SYNCED, System.currentTimeMillis())
        }
        db.insertWithOnConflict(TABLE_CACHED_TRANSACTION, null, values, SQLiteDatabase.CONFLICT_REPLACE)
    }

    fun getCachedTransactions(): List<JSONObject> {
        val list = ArrayList<JSONObject>()
        val db = readableDatabase
        val cursor = db.query(TABLE_CACHED_TRANSACTION, null, null, null, null, null, "$COL_TRX_LAST_SYNCED DESC")
        cursor.use { c ->
            while (c.moveToNext()) {
                val obj = JSONObject().apply {
                    put("id", c.getString(c.getColumnIndexOrThrow(COL_TRX_ID)))
                    put("transactionCode", c.getString(c.getColumnIndexOrThrow(COL_TRX_CODE)))
                    put("reservationId", c.getString(c.getColumnIndexOrThrow(COL_TRX_RES_ID)))
                    put("prosumerNic", c.getString(c.getColumnIndexOrThrow(COL_TRX_PROSUMER_NIC)))
                    put("nodeId", c.getString(c.getColumnIndexOrThrow(COL_TRX_NODE_ID)))
                    put("nodeName", c.getString(c.getColumnIndexOrThrow(COL_TRX_NODE_NAME)))
                    put("energyTransferredKWh", c.getDouble(c.getColumnIndexOrThrow(COL_TRX_ENERGY_KWH)))
                    put("transactionStatus", c.getString(c.getColumnIndexOrThrow(COL_TRX_STATUS)))
                }
                list.add(obj)
            }
        }
        return list
    }

    // --- Helper CRUD for CACHED_NODE ---
    fun saveOrUpdateNode(nodeObj: JSONObject) {
        val db = writableDatabase
        val values = ContentValues().apply {
            val id = nodeObj.optString("id", nodeObj.optString("_id"))
            put(COL_NODE_ID, id)
            put(COL_NODE_CODE, nodeObj.optString("nodeCode", "NODE"))
            put(COL_NODE_NAME, nodeObj.optString("name", "Microgrid Station"))
            put(COL_NODE_LATITUDE, nodeObj.optDouble("latitude", 0.0))
            put(COL_NODE_LONGITUDE, nodeObj.optDouble("longitude", 0.0))
            put(COL_NODE_ADDRESS, nodeObj.optString("address", ""))
            put(COL_NODE_CAPACITY, nodeObj.optDouble("capacityKWh", 0.0))
            put(COL_NODE_AVAIL_SLOTS, nodeObj.optInt("availableBatterySlots", 0))
            put(COL_NODE_TOTAL_SLOTS, nodeObj.optInt("totalBatterySlots", 10))
            put(COL_NODE_IS_ACTIVE, if (nodeObj.optBoolean("isActive", true)) 1 else 0)
            put(COL_NODE_LAST_SYNCED, System.currentTimeMillis())
        }
        db.insertWithOnConflict(TABLE_CACHED_NODE, null, values, SQLiteDatabase.CONFLICT_REPLACE)
    }

    fun getCachedNodes(): List<JSONObject> {
        val list = ArrayList<JSONObject>()
        val db = readableDatabase
        val cursor = db.query(TABLE_CACHED_NODE, null, null, null, null, null, null)
        cursor.use { c ->
            while (c.moveToNext()) {
                val obj = JSONObject().apply {
                    put("id", c.getString(c.getColumnIndexOrThrow(COL_NODE_ID)))
                    put("nodeCode", c.getString(c.getColumnIndexOrThrow(COL_NODE_CODE)))
                    put("name", c.getString(c.getColumnIndexOrThrow(COL_NODE_NAME)))
                    put("latitude", c.getDouble(c.getColumnIndexOrThrow(COL_NODE_LATITUDE)))
                    put("longitude", c.getDouble(c.getColumnIndexOrThrow(COL_NODE_LONGITUDE)))
                    put("address", c.getString(c.getColumnIndexOrThrow(COL_NODE_ADDRESS)))
                    put("capacityKWh", c.getDouble(c.getColumnIndexOrThrow(COL_NODE_CAPACITY)))
                    put("availableBatterySlots", c.getInt(c.getColumnIndexOrThrow(COL_NODE_AVAIL_SLOTS)))
                    put("totalBatterySlots", c.getInt(c.getColumnIndexOrThrow(COL_NODE_TOTAL_SLOTS)))
                    put("isActive", c.getInt(c.getColumnIndexOrThrow(COL_NODE_IS_ACTIVE)) == 1)
                }
                list.add(obj)
            }
        }
        return list
    }
}

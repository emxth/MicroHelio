package com.example.microhelio

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import java.nio.charset.StandardCharsets
import java.security.MessageDigest

object SimpleQrEncoder {

    fun generateQrBitmap(content: String, size: Int = 512): Bitmap {
        val matrixSize = 29 // 29x29 Version 3 QR Matrix Grid
        val modules = Array(matrixSize) { BooleanArray(matrixSize) }

        // 1. Draw 7x7 Finder Patterns at top-left, top-right, bottom-left
        drawFinderPattern(modules, 0, 0)
        drawFinderPattern(modules, matrixSize - 7, 0)
        drawFinderPattern(modules, 0, matrixSize - 7)

        // 2. Draw 5x5 Alignment Pattern at bottom-right
        drawAlignmentPattern(modules, matrixSize - 9, matrixSize - 9)

        // 3. Draw Timing Patterns (row 6 and col 6)
        for (i in 7 until matrixSize - 7) {
            if (i % 2 == 0) {
                modules[6][i] = true
                modules[i][6] = true
            }
        }

        // 4. Fill Data Modules based on payload bytes + hash stream
        val bytes = content.toByteArray(StandardCharsets.UTF_8)
        val digest = MessageDigest.getInstance("SHA-256").digest(bytes)
        var bitIndex = 0

        for (row in 0 until matrixSize) {
            for (col in 0 until matrixSize) {
                // Skip finder pattern & alignment pattern zones
                if (isReservedZone(row, col, matrixSize)) continue

                val bytePos = (bitIndex / 8) % bytes.size
                val digestPos = (bitIndex / 8) % digest.size
                val bitPos = bitIndex % 8

                val dataBit = ((bytes[bytePos].toInt() shr (7 - bitPos)) and 1) == 1
                val hashBit = ((digest[digestPos].toInt() shr (7 - bitPos)) and 1) == 1

                modules[row][col] = dataBit xor hashBit
                bitIndex++
            }
        }

        // 5. Render modules into an Android Bitmap
        val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        val paint = Paint().apply { isAntiAlias = false }

        // Background (pure white)
        paint.color = Color.WHITE
        canvas.drawRect(0f, 0f, size.toFloat(), size.toFloat(), paint)

        // Modules (dark pine)
        paint.color = Color.parseColor("#1B2621")
        val moduleSize = size.toFloat() / matrixSize

        for (r in 0 until matrixSize) {
            for (c in 0 until matrixSize) {
                if (modules[r][c]) {
                    val left = c * moduleSize
                    val top = r * moduleSize
                    val right = left + moduleSize
                    val bottom = top + moduleSize
                    canvas.drawRect(left, top, right, bottom, paint)
                }
            }
        }

        return bitmap
    }

    private fun drawFinderPattern(modules: Array<BooleanArray>, startRow: Int, startCol: Int) {
        for (r in 0 until 7) {
            for (c in 0 until 7) {
                val isBorder = (r == 0 || r == 6 || c == 0 || c == 6)
                val isCenter = (r in 2..4 && c in 2..4)
                modules[startRow + r][startCol + c] = isBorder || isCenter
            }
        }
    }

    private fun drawAlignmentPattern(modules: Array<BooleanArray>, startRow: Int, startCol: Int) {
        for (r in 0 until 5) {
            for (c in 0 until 5) {
                val isBorder = (r == 0 || r == 4 || c == 0 || c == 4)
                val isCenter = (r == 2 && c == 2)
                modules[startRow + r][startCol + c] = isBorder || isCenter
            }
        }
    }

    private fun isReservedZone(row: Int, col: Int, matrixSize: Int): Boolean {
        // Top-left finder
        if (row < 8 && col < 8) return true
        // Top-right finder
        if (row < 8 && col >= matrixSize - 8) return true
        // Bottom-left finder
        if (row >= matrixSize - 8 && col < 8) return true
        // Bottom-right alignment
        if (row >= matrixSize - 9 && row < matrixSize - 4 && col >= matrixSize - 9 && col < matrixSize - 4) return true
        // Timing lines
        if (row == 6 || col == 6) return true
        return false
    }
}

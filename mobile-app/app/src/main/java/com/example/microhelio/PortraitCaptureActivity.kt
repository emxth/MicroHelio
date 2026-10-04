package com.example.microhelio

import com.journeyapps.barcodescanner.CaptureActivity
import com.journeyapps.barcodescanner.DecoratedBarcodeView
import com.journeyapps.barcodescanner.camera.CameraSettings

/**
 * Custom Portrait Capture Activity forcing portrait orientation for ZXing camera scanning.
 */
class PortraitCaptureActivity : CaptureActivity() {

    private lateinit var decoratedBarcodeView: DecoratedBarcodeView

    override fun initializeContent(): DecoratedBarcodeView {
        setContentView(R.layout.activity_portrait_capture)
        decoratedBarcodeView = findViewById(R.id.zxing_barcode_scanner)

        val cameraSettings = CameraSettings()
        cameraSettings.focusMode = CameraSettings.FocusMode.CONTINUOUS
        cameraSettings.isAutoFocusEnabled = true
        decoratedBarcodeView.barcodeView.cameraSettings = cameraSettings

        return decoratedBarcodeView
    }
}

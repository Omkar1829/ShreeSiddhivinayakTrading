import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../services/api';
import { Camera, CheckCircle, AlertOctagon, RotateCcw, Loader2 } from 'lucide-react';

export default function DeliveryScanner() {
  const qrRegionId = "delivery-qr-reader";
  const scannerRef = useRef(null);
  const isMountedRef = useRef(true);
  const initializingRef = useRef(false);

  const [scanResult, setScanResult] = useState(null); // 'SUCCESS' | 'ERROR' | null
  const [errorMessage, setErrorMessage] = useState('');
  const [successDetails, setSuccessDetails] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);

  useEffect(() => {
    isMountedRef.current = true;
    
    // Start scanner on load if not already verified
    if (!scanResult && !verifying) {
      startScanner();
    }

    return () => {
      isMountedRef.current = false;
      stopScanner();
    };
  }, [scanResult, verifying]);

  const startScanner = async () => {
    if (initializingRef.current || (scannerRef.current && scannerRef.current.isScanning)) {
      return;
    }
    initializingRef.current = true;

    try {
      // Ensure element exists in DOM before starting
      setTimeout(async () => {
        if (!isMountedRef.current) {
          initializingRef.current = false;
          return;
        }

        // Clean up any existing instances first to be safe
        if (scannerRef.current) {
          try {
            if (scannerRef.current.isScanning) {
              await scannerRef.current.stop();
            }
          } catch (e) {
            console.warn("Error stopping scanner during reset:", e);
          }
          scannerRef.current = null;
        }

        const container = document.getElementById(qrRegionId);
        if (!container) {
          initializingRef.current = false;
          return;
        }

        try {
          const html5QrcodeScanner = new Html5Qrcode(qrRegionId);
          scannerRef.current = html5QrcodeScanner;

          const config = { fps: 10, qrbox: { width: 250, height: 250 } };

          await html5QrcodeScanner.start(
            { facingMode: "environment" },
            config,
            handleScanSuccess,
            handleScanError
          );

          if (isMountedRef.current) {
            setScannerActive(true);
            setErrorMessage('');
          } else {
            // Unmounted while starting
            await html5QrcodeScanner.stop();
          }
        } catch (err) {
          console.error('Scanner start error:', err);
          if (isMountedRef.current) {
            setErrorMessage('Failed to access rear camera. Please ensure camera permissions are allowed.');
          }
        } finally {
          initializingRef.current = false;
        }
      }, 100);
    } catch (err) {
      console.error('Scanner init wrapper error:', err);
      initializingRef.current = false;
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      const scanner = scannerRef.current;
      scannerRef.current = null; // Clear reference immediately to prevent multiple parallel stops
      if (scanner.isScanning) {
        try {
          await scanner.stop();
          setScannerActive(false);
        } catch (err) {
          console.error('Failed to stop scanner:', err);
        }
      }
    }
  };

  const handleScanSuccess = async (decodedText) => {
    // Stop scanning once success is hit to avoid multiple parallel API requests
    await stopScanner();
    setVerifying(true);

    try {
      // Decode token from URL query string if URL was scanned
      let token = decodedText;
      if (decodedText.includes('token=')) {
        const match = decodedText.match(/[?&]token=([^&]+)/);
        if (match) {
          token = decodeURIComponent(match[1]);
        }
      }

      const res = await api.post('/api/delivery/verify', { token });
      if (res.data.success) {
        setSuccessDetails(res.data);
        setScanResult('SUCCESS');
      }
    } catch (err) {
      setErrorMessage(err.message || 'QR verification failed.');
      setScanResult('ERROR');
    } finally {
      setVerifying(false);
    }
  };

  const handleScanError = (errorMessage) => {
    // Quietly log scanning errors (fires constantly when no code detected)
  };

  const handleReset = () => {
    setScanResult(null);
    setSuccessDetails(null);
    setErrorMessage('');
    setVerifying(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col justify-center p-4">
      
      {/* 1. Loading Verification Overlay */}
      {verifying && (
        <div className="text-center space-y-4">
          <Loader2 className="animate-spin text-accent-500 mx-auto" size={48} />
          <h2 className="text-xl font-bold">Decrypting QR Token...</h2>
          <p className="text-xs text-gray-400">Verifying signature and updating order status...</p>
        </div>
      )}

      {/* 2. Success screen */}
      {!verifying && scanResult === 'SUCCESS' && (
        <div className="max-w-md w-full mx-auto text-center space-y-6 animate-fade-in">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 text-white mx-auto shadow-lg shadow-emerald-900/30">
            <CheckCircle size={44} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-emerald-450 tracking-tight">Delivery Confirmed!</h2>
            <p className="text-sm text-gray-300">Order has been verified successfully.</p>
          </div>

          {successDetails && (
            <div className="rounded-2xl bg-gray-800 p-5 border border-gray-700 text-left text-xs font-semibold space-y-3 max-w-sm mx-auto">
              <div className="flex justify-between">
                <span className="text-gray-400">Order Number</span>
                <span className="text-white">{successDetails.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Recipient Name</span>
                <span className="text-white">{successDetails.recipientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Time Delivered</span>
                <span className="text-white">{new Date(successDetails.deliveredAt).toLocaleTimeString()}</span>
              </div>
            </div>
          )}

          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary-700 px-6 py-3 text-xs font-bold text-white hover:bg-primary-600 transition"
          >
            <RotateCcw size={15} /> Scan Next Package
          </button>
        </div>
      )}

      {/* 3. Error screen */}
      {!verifying && scanResult === 'ERROR' && (
        <div className="max-w-md w-full mx-auto text-center space-y-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500 text-white mx-auto shadow-lg shadow-red-950/30">
            <AlertOctagon size={44} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-red-500 tracking-tight">Verification Failed</h2>
            <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed mt-1">
              {errorMessage || 'The scanned QR code is invalid, expired, or has already been verified.'}
            </p>
          </div>

          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 rounded-xl bg-red-650 px-6 py-3 text-xs font-bold text-white hover:bg-red-700 transition"
          >
            <RotateCcw size={15} /> Try Scanning Again
          </button>
        </div>
      )}

      {/* 4. Scanning interface view */}
      {!verifying && !scanResult && (
        <div className="max-w-md w-full mx-auto flex flex-col items-center space-y-6">
          <div className="text-center space-y-1.5">
            <h2 className="text-lg font-bold flex items-center justify-center gap-1.5">
              <Camera size={18} className="text-accent-500" /> Delivery QR Scanner
            </h2>
            <p className="text-xs text-gray-400 max-w-xs">
              Align the customer's secure delivery QR code inside the green square target.
            </p>
          </div>

          {/* Scanner view region */}
          <div className="relative overflow-hidden rounded-2xl border-2 border-gray-700 bg-black aspect-square w-full shadow-2xl">
            <div id={qrRegionId} className="h-full w-full"></div>
            {/* Centered green boundary box overlay */}
            {scannerActive && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="h-60 w-60 border-2 border-dashed border-emerald-500 rounded-lg bg-emerald-500 bg-opacity-5"></div>
              </div>
            )}
          </div>

          {errorMessage && (
            <div className="rounded-xl bg-red-950 border border-red-900 p-3 text-xs text-red-400 max-w-xs text-center leading-relaxed">
              {errorMessage}
            </div>
          )}

          <div className="text-[10px] text-gray-500 text-center uppercase tracking-widest font-black">
            Shri Siddhivinayak Trading
          </div>
        </div>
      )}

    </div>
  );
}

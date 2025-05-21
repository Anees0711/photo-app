import React, { useState, useRef, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';

const stripePromise = loadStripe('pk_test_YOUR_PUBLISHABLE_KEY'); // replace with your Stripe publishable key

const COUNTRIES = [
  {
    code: 'USA',
    name_en: 'United States',
    name_ur: 'ریاستہائے متحدہ',
    dimensions: { width: 51, height: 51 }, // mm
    bg: 'white',
  },
  {
    code: 'UK',
    name_en: 'United Kingdom',
    name_ur: 'برطانیہ',
    dimensions: { width: 35, height: 45 },
    bg: 'lightgrey',
  },
  {
    code: 'CAN',
    name_en: 'Canada',
    name_ur: 'کینیڈا',
    dimensions: { width: 50, height: 70 },
    bg: 'white',
  },
  {
    code: 'FRA',
    name_en: 'France',
    name_ur: 'فرانس',
    dimensions: { width: 35, height: 45 },
    bg: 'white',
  },
  {
    code: 'AUS',
    name_en: 'Australia',
    name_ur: 'آسٹریلیا',
    dimensions: { width: 35, height: 45 },
    bg: 'white',
  },
  // add more countries if needed
];

const LANG = {
  en: {
    capturePhoto: 'Capture Photo',
    selectCountry: 'Select Country / Visa Type',
    selectBackground: 'Select Background Color',
    recommendedBackground: 'Recommended background for this visa is',
    selectQuantity: 'Select Quantity (1-15)',
    language: 'Language',
    photoPreview: 'Photo Preview',
    payNow: 'Pay Now',
    easypaisa: 'Pay with Easypaisa',
    jazzcash: 'Pay with JazzCash',
    passport: 'Passport Photo',
    visa: 'Visa Photo',
    selectPhotoType: 'Select Photo Type',
    instructions: 'Instructions',
    errorNoPhoto: 'Please capture a photo first.',
    paymentSuccess: 'Payment successful! Thank you.',
    paymentFailed: 'Payment failed. Please try again.',
  },
  ur: {
    capturePhoto: 'تصویر لیں',
    selectCountry: 'ملک/ویزا منتخب کریں',
    selectBackground: 'پس منظر کا رنگ منتخب کریں',
    recommendedBackground: 'اس ویزا کے لیے تجویز کردہ پس منظر',
    selectQuantity: 'تعداد منتخب کریں (1-15)',
    language: 'زبان',
    photoPreview: 'تصویر کا جائزہ',
    payNow: 'اب ادائیگی کریں',
    easypaisa: 'ایزی پیسہ سے ادائیگی کریں',
    jazzcash: 'جیزکیش سے ادائیگی کریں',
    passport: 'پاسپورٹ تصویر',
    visa: 'ویزا تصویر',
    selectPhotoType: 'تصویر کی قسم منتخب کریں',
    instructions: 'ہدایت',
    errorNoPhoto: 'براہ کرم پہلے تصویر لیں۔',
    paymentSuccess: 'ادائیگی کامیاب! شکریہ۔',
    paymentFailed: 'ادائیگی ناکام۔ دوبارہ کوشش کریں۔',
  }
};

function PaymentForm({ amount, onSuccess, onError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!stripe || !elements) {
      setLoading(false);
      return;
    }

    try {
      // Call backend to create payment intent
      const res = await fetch('http://localhost:5000/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amount * 100 }), // amount in cents
      });
      const { clientSecret } = await res.json();

      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
        },
      });

      if (result.error) {
        setError(result.error.message);
        onError && onError(result.error.message);
      } else {
        if (result.paymentIntent.status === 'succeeded') {
          onSuccess && onSuccess();
        }
      }
    } catch (err) {
      setError('Payment failed');
      onError && onError('Payment failed');
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <CardElement />
      <button type="submit" disabled={!stripe || loading} style={{ marginTop: '10px' }}>
        {loading ? 'Processing...' : 'Pay Now'}
      </button>
      {error && <div style={{ color: 'red' }}>{error}</div>}
    </form>
  );
}

export default function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [language, setLanguage] = useState('en');
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [backgroundColor, setBackgroundColor] = useState('white');
  const [quantity, setQuantity] = useState(1);
  const [photoType, setPhotoType] = useState('passport'); // 'passport' or 'visa'
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  // Start webcam on mount
  useEffect(() => {
    async function setupCamera() {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    }
    setupCamera();
  }, []);

  // Capture photo from webcam
  function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Draw video frame on canvas
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Save image data
    const dataURL = canvas.toDataURL('image/png');
    setCapturedImage(dataURL);
  }

  // Apply cropping and background color according to selected visa requirements
  function getProcessedImage() {
    if (!capturedImage) return null;

    const img = new Image();
    img.src = capturedImage;

    // Create offscreen canvas to crop and change background
    const offCanvas = document.createElement('canvas');
    const ctx = offCanvas.getContext('2d');

    // Convert mm to pixels roughly (assume 96 dpi, 1 inch = 25.4 mm)
    const dpi = 96;
    const widthPx = (selectedCountry.dimensions.width / 25.4) * dpi;
    const heightPx = (selectedCountry.dimensions.height / 25.4) * dpi;

    offCanvas.width = widthPx;
    offCanvas.height = heightPx;

    // Draw background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, offCanvas.width, offCanvas.height);

    return new Promise((resolve) => {
      img.onload = () => {
        // Calculate scale to fit image in the canvas (cover)
        const scale = Math.max(widthPx / img.width, heightPx / img.height);
        const sw = widthPx / scale;
        const sh = heightPx / scale;

        // Crop center area of original image
        const sx = (img.width - sw) / 2;
        const sy = (img.height - sh) / 2;

        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, widthPx, heightPx);
        resolve(offCanvas.toDataURL());
      };
    });
  }

  const [processedImage, setProcessedImage] = useState(null);

  async function updateProcessedImage() {
    const result = await getProcessedImage();
    setProcessedImage(result);
  }

  useEffect(() => {
    if (capturedImage) {
      updateProcessedImage();
    }
  }, [capturedImage, backgroundColor, selectedCountry]);

  // Language texts helper
  function t(key) {
    return LANG[language][key];
  }

  return (
    <div style={{ maxWidth: 800, margin: 'auto', fontFamily: 'Arial, sans-serif' }}>
      <h2>Visa & Passport Photo App</h2>
      <div>
        <label>{t('language')}: </label>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          style={{ marginBottom: 20 }}
        >
          <option value="en">English</option>
          <option value="ur">اردو</option>
        </select>
      </div>

      <div>
        <label>{t('selectPhotoType')}:</label>
        <select
          value={photoType}
          onChange={(e) => setPhotoType(e.target.value)}
          style={{ marginBottom: 20, marginLeft: 10 }}
        >
          <option value="passport">{t('passport')}</option>
          <option value="visa">{t('visa')}</option>
        </select>
      </div>

      <div>
        <label>{t('selectCountry')}:</label>
        <select
          value={selectedCountry.code}
          onChange={(e) => {
            const country = COUNTRIES.find(c => c.code === e.target.value);
            setSelectedCountry(country);
            setBackgroundColor(country.bg);
          }}
          style={{ marginBottom: 20, marginLeft: 10 }}
          disabled={photoType === 'passport'}
        >
          {photoType === 'passport' ? (
            <option value="">N/A for passport</option>
          ) : (
            COUNTRIES.map(c => (
              <option key={c.code} value={c.code}>
                {language === 'en' ? c.name_en : c.name_ur}
              </option>
            ))
          )}
        </select>
      </div>

      <div>
        <label>{t('selectBackground')}:</label>
        <select
          value={backgroundColor}
          onChange={(e) => setBackgroundColor(e.target.value)}
          style={{ marginBottom: 20, marginLeft: 10 }}
        >
          <option value="white">White</option>
          <option value="lightgrey">Light Grey</option>
          <option value="blue">Blue</option>
          <option value="green">Green</option>
          <option value="red">Red</option>
          <option value="yellow">Yellow</option>
        </select>
        <div>
          <small>{t('recommendedBackground')}: <b>{selectedCountry.bg}</b></small>
        </div>
      </div>

      <div>
        <label>{t('selectQuantity')}:</label>
        <input
          type="number"
          min={1}
          max={15}
          value={quantity}
          onChange={e => setQuantity(Math.min(15, Math.max(1, Number(e.target.value))))}
          style={{ marginLeft: 10, width: 50 }}
        />
      </div>

      <div style={{ marginTop: 20 }}>
        <video ref={videoRef} style={{ width: 320, height: 240, border: '1px solid black' }} />
        <br />
        <button onClick={capturePhoto} style={{ marginTop: 10 }}>
          {t('capturePhoto')}
        </button>
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {capturedImage && (
        <div style={{ marginTop: 20 }}>
          <h3>{t('photoPreview')}:</h3>
          {processedImage ? (
            <img
              src={processedImage}
              alt="Processed"
              style={{ border: '1px solid #ccc', width: 200, height: 'auto' }}
            />
          ) : (
            <p>Processing...</p>
          )}
        </div>
      )}

      <div style={{ marginTop: 30 }}>
        <h3>{t('instructions')}:</h3>
        <ul>
          <li>Use your webcam to capture photo.</li>
          <li>Choose country visa to get correct dimensions & background.</li>
          <li>Adjust background color if needed.</li>
          <li>Choose quantity of prints.</li>
          <li>Proceed to payment.</li>
        </ul>
      </div>

      <div style={{ marginTop: 20 }}>
        {paymentSuccess ? (
          <div style={{ color: 'green' }}>{t('paymentSuccess')}</div>
        ) : (
          <>
            {!capturedImage && <div style={{ color: 'red' }}>{t('errorNoPhoto')}</div>}
            {capturedImage && (
              <Elements stripe={stripePromise}>
                <PaymentForm
                  amount={quantity * 100} // dummy price: 100 PKR per photo
                  onSuccess={() => setPaymentSuccess(true)}
                  onError={msg => setPaymentError(msg)}
                />
              </Elements>
            )}
            {paymentError && <div style={{ color: 'red' }}>{paymentError}</div>}
          </>
        )}
      </div>

      <div style={{ marginTop: 30 }}>
        <button onClick={() => alert('Easypaisa payment integration coming soon')}>
          {t('easypaisa')}
        </button>{' '}
        <button onClick={() => alert('JazzCash payment integration coming soon')}>
          {t('jazzcash')}
        </button>
      </div>
    </div>
  );
}

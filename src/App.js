import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Ticket, User, CreditCard, Film, Database, RefreshCw } from 'lucide-react';

// Backend API URL - Make sure backend is running on port 5000
const API_URL = 'http://localhost:5000/api/bookings';

const VOJMovieBooking = () => {
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [userInfo, setUserInfo] = useState({ name: '', email: '', phone: '' });
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [loading, setLoading] = useState(false);

  // hover helpers for movie cards and seats
  const [hoveredCard, setHoveredCard] = useState(null);
  const [hoveredSeat, setHoveredSeat] = useState(null);

  useEffect(() => {
    // Load Razorpay checkout script (safe to include — it won't run unless you open it)
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // ============================================
  // BACKEND API FUNCTIONS
  // ============================================

  const fetchBookings = async () => {
    try {
      setLoading(true);
      console.log('Fetching bookings from database...');

      const response = await fetch(API_URL);
      const data = await response.json();

      if (data.success) {
        setBookings(data.bookings);
        console.log('Loaded bookings from database:', data.bookings.length);
      } else {
        // backend might return an object without success flag in some setups
        if (Array.isArray(data)) setBookings(data);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      // Friendly in-browser message
      // Do not throw — keep UI working offline
    } finally {
      setLoading(false);
    }
  };

  const saveToDatabase = async (bookingData) => {
    try {
      console.log('Saving booking to database...');

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      });

      const data = await response.json();

      if (data.success) {
        console.log('Booking saved! ID:', data.bookingId);
        return { success: true, bookingId: data.bookingId };
      } else {
        return { success: false, error: data.error || 'Unknown error' };
      }
    } catch (error) {
      console.error('Error saving to database:', error);
      return { success: false, error: error.message };
    }
  };

  const clearDatabase = async () => {
    if (!window.confirm('Clear all bookings from database?')) return;

    try {
      const response = await fetch(API_URL, { method: 'DELETE' });
      const data = await response.json();

      if (data.success) {
        alert('Database cleared! Deleted ' + data.deletedCount + ' bookings');
        fetchBookings();
      }
    } catch (error) {
      alert('Failed to clear database');
    }
  };

  useEffect(() => {
    if (currentPage === 'bookings') {
      fetchBookings();
    }
  }, [currentPage]);

  // --------------------
  // Movies data (kept as your original format)
  // --------------------
 const movies = [
  {
    id: 1,
    title: "Kantara Chapter 1",
    genre: "Action Drama",
    duration: "2h 45m",
    rating: "9.1",
    image: "/images/kantra2.jpg", // ✅ JPEG in public/images/
    trailer: "https://www.youtube.com/watch?v=DzYYmTbsN84",
    description: "The prequel to the blockbuster Kantara",
    language: "Kannada/Hindi",
    price: 350,
  },
  {
    id: 2,
    title: "Sunny Sanskari Ki Tulsi Kumari",
    genre: "Romantic Comedy",
    duration: "2h 20m",
    rating: "8.3",
    image: "/images/sunny.jpg", // ✅ JPEG in public/images/
    trailer: "https://www.youtube.com/watch?v=9FUd-D4FWjw",
    description: "A delightful romantic comedy",
    language: "Hindi",
    price: 320,
  },
  {
    id: 3,
    title: "Madharaasi",
    genre: "Action Thriller",
    duration: "2h 15m",
    rating: "8.6",
    image: "/images/Madarsi.jpg", // ✅ JPEG in public/images/
    trailer: "https://www.youtube.com/watch?v=Hgw4S7SDo3U",
    description: "An intense action thriller",
    language: "Tamil/Hindi",
    price: 300,
  },
];

  const showTimes = ['10:00 AM', '01:00 PM', '04:00 PM', '07:00 PM', '10:00 PM'];
  const dates = ['Oct 5', 'Oct 6', 'Oct 7', 'Oct 8', 'Oct 9'];

  const generateSeats = () => {
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const seats = [];
    rows.forEach((row) => {
      for (let i = 1; i <= 12; i++) {
        seats.push({ id: row + i, row, number: i, booked: Math.random() > 0.7 });
      }
    });
    return seats;
  };

  const [seats] = useState(generateSeats());

  const toggleSeat = (seatId) => {
    if (seats.find((s) => s.id === seatId && s.booked)) return;
    setSelectedSeats((prev) => (prev.includes(seatId) ? prev.filter((id) => id !== seatId) : [...prev, seatId]));
  };

  const handleBooking = () => {
    if (!userInfo.name || !userInfo.email || !userInfo.phone) {
      alert('Please fill all user details!');
      return;
    }
    setShowPayment(true);
  };

  const processPayment = async () => {
    if (!paymentMethod) {
      alert('Please select a payment method!');
      return;
    }

    const totalAmount = selectedMovie.price * selectedSeats.length;

    // If you have Razorpay public key and want to open live checkout from frontend only (no server order):
    if (paymentMethod === 'Razorpay' && window.Razorpay) {
      try {
        const options = {
          key: process.env.REACT_APP_RAZORPAY_KEY || 'rzp_test_YOUR_KEY', // replace with your key in .env as REACT_APP_RAZORPAY_KEY
          amount: totalAmount * 100,
          currency: 'INR',
          name: 'VOJ Cinema',
          description: selectedMovie.title,
          handler: async function (response) {
            // response.razorpay_payment_id available
            const bookingData = {
              movie: selectedMovie.title,
              date: selectedDate,
              time: selectedTime,
              seats: selectedSeats,
              user: userInfo,
              totalPrice: totalAmount,
              paymentMethod: paymentMethod,
              paymentId: response.razorpay_payment_id,
            };

            const result = await saveToDatabase(bookingData);
            if (result.success) {
              alert('Booking Successful! Saved to Database! Booking ID: ' + result.bookingId);
              setCurrentPage('bookings');
              resetBookingForm();
            } else {
              alert('Failed to save booking. Please try again.');
            }
          },
          prefill: {
            name: userInfo.name,
            email: userInfo.email,
            contact: userInfo.phone,
          },
          theme: { color: '#7C3AED' },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
        return; // exit — handler will save
      } catch (err) {
        console.warn('Razorpay checkout failed, falling back to simulated payment', err);
      }
    }

    // fallback (simulated) payment flow — saves booking to DB directly
    const bookingData = {
      movie: selectedMovie.title,
      date: selectedDate,
      time: selectedTime,
      seats: selectedSeats,
      user: userInfo,
      totalPrice: totalAmount,
      paymentMethod: paymentMethod,
      paymentId: 'PAY' + Date.now(),
    };

    const result = await saveToDatabase(bookingData);

    if (result.success) {
      alert('Booking Successful! Saved to Database! Booking ID: ' + result.bookingId);
      setCurrentPage('bookings');
      resetBookingForm();
    } else {
      alert('Failed to save booking. Please try again.');
    }
  };

  const resetBookingForm = () => {
    setSelectedSeats([]);
    setUserInfo({ name: '', email: '', phone: '' });
    setShowPayment(false);
    setPaymentMethod('');
  };

  // --------------------
  // UI Components (unchanged logic, only spacing/centering/coloring updated)
  // --------------------

  // Common color/theme values used repeatedly
  const theme = {
    slate900: '#0f172a',
    purple900: '#4c1d95',
    purple500: '#7C3AED',
    pink600: '#db2777',
    purple300: '#c4b5fd',
    purple400: '#A78BFA',
    slate800: '#1f2937',
    slate700: '#374151',
    slate600: '#4b5563',
    textWhite: '#ffffff',
    textGray400: '#9ca3af',
    green500: '#10b981',
    emerald600: '#059669',
    yellow500: '#FBBF24',
    bgGradientMain: 'linear-gradient(135deg,#0f172a 0%, #4c1d95 50%, #0f172a 100%)',
  };

  // Small utility styles
  const styles = {
    pageContainer: {
      minHeight: '100vh',
      width: '100%',
      backgroundImage: theme.bgGradientMain,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    },
    headerOverlay: {
      backgroundColor: 'rgba(0,0,0,0.4)',
      backdropFilter: 'blur(8px)',
      borderBottom: `1px solid rgba(124,58,237,0.3)`,
      position: 'sticky',
      top: 0,
      zIndex: 50,
      width: '100%',
    },
    headerInner: {
      maxWidth: '1120px',
      margin: '0 auto',
      padding: '16px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    logoTitle: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    },
    vojTitle: {
      fontSize: '1.875rem',
      fontWeight: 700,
      background: 'linear-gradient(90deg,#A78BFA 0%, #db2777 100%)',
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      color: 'transparent',
    },
    nav: {
      display: 'flex',
      gap: '24px',
    },
    navButton: {
      color: theme.textWhite,
      background: 'transparent',
      border: 'none',
      fontSize: '1rem',
      cursor: 'pointer',
      transition: 'color 180ms ease',
    },
    mainContentWrap: {
      maxWidth: '1120px',
      margin: '0 auto',
      paddingLeft: '16px',
      paddingRight: '16px',
      paddingTop: '48px',
      paddingBottom: '48px',
      width: '100%',
    },
    pageHeading: {
      textAlign: 'center',
      marginBottom: '48px',
    },
    headingH2: {
      fontSize: '3rem',
      fontWeight: 700,
      color: theme.textWhite,
      marginBottom: '8px',
    },
    headingP: {
      color: theme.purple300,
      fontSize: '1.125rem',
    },
    // card
    movieGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(1, 1fr)',
      gap: '24px',
    },
    // responsive tweak for md screens - keep CSS responsiveness inline using media queries is not possible,
    // but we approximate by allowing the grid to flow using CSS grid auto-fit via minmax where possible.
    movieCard: {
      borderRadius: '12px',
      overflow: 'hidden',
      border: `1px solid rgba(124,58,237,0.2)`,
      backgroundImage: 'linear-gradient(to bottom, rgba(76,29,149,0.16), rgba(15,23,42,0.16))',
      transition: 'transform 220ms ease, box-shadow 220ms ease',
      cursor: 'default',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      maxWidth: '360px',
    },
    movieImageWrap: {
      position: 'relative',
      height: '20rem', // corresponds to h-80
      overflow: 'hidden',
      flexShrink: 0,
    },
    movieImage: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      display: 'block',
    },
    ratingBadge: {
      position: 'absolute',
      top: '12px',
      right: '12px',
      backgroundColor: theme.yellow500,
      color: '#000',
      padding: '6px 10px',
      borderRadius: '999px',
      fontWeight: 700,
      fontSize: '0.875rem',
    },
    movieBody: {
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    },
    movieTitle: {
      fontSize: '1.125rem',
      fontWeight: 700,
      color: theme.textWhite,
      margin: 0,
    },
    movieMetaRow: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      color: theme.purple300,
      fontSize: '0.875rem',
      marginBottom: '8px',
    },
    genrePill: {
      backgroundColor: 'rgba(124,58,237,0.12)',
      padding: '6px 8px',
      borderRadius: '8px',
      display: 'inline-block',
    },
    movieDesc: {
      color: theme.textGray400,
      fontSize: '0.875rem',
      marginBottom: '8px',
    },
    buttonRow: {
      display: 'flex',
      gap: '8px',
    },
    primaryButton: {
      flex: 1,
      backgroundImage: 'linear-gradient(90deg,#7C3AED 0%, #db2777 100%)',
      color: theme.textWhite,
      padding: '10px 12px',
      borderRadius: '10px',
      fontWeight: 600,
      fontSize: '0.875rem',
      border: 'none',
      cursor: 'pointer',
    },
    secondaryButton: {
      flex: 1,
      backgroundColor: 'rgba(255,255,255,0.06)',
      color: theme.textWhite,
      padding: '10px 12px',
      borderRadius: '10px',
      fontWeight: 600,
      fontSize: '0.875rem',
      border: '1px solid rgba(124,58,237,0.12)',
      cursor: 'pointer',
    },

    // Booking page
    bookingPageWrap: {
      minHeight: '100vh',
      width: '100%',
      backgroundImage: theme.bgGradientMain,
      padding: '24px',
      display: 'flex',
      justifyContent: 'center',
    },
    bookingInner: {
      maxWidth: '960px',
      width: '100%',
    },
    backButton: {
      color: '#A78BFA',
      background: 'transparent',
      border: 'none',
      padding: 0,
      marginBottom: '16px',
      cursor: 'pointer',
    },
    panel: {
      backgroundColor: 'rgba(124,58,237,0.12)',
      borderRadius: '20px',
      padding: '24px',
      marginBottom: '24px',
      border: `1px solid rgba(124,58,237,0.12)`,
    },
    infoTitle: {
      fontSize: '1.5rem',
      fontWeight: 700,
      color: theme.textWhite,
      marginBottom: '8px',
    },
    infoDesc: {
      color: theme.purple300,
      marginBottom: '12px',
    },
    grid2Cols: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2,1fr)',
      gap: '12px',
      fontSize: '0.9rem',
      marginTop: '12px',
    },

    // select boxes & buttons
    selectWrap: {
      backgroundColor: 'rgba(15,23,42,0.38)',
      borderRadius: '20px',
      padding: '24px',
      marginBottom: '24px',
      border: `1px solid rgba(124,58,237,0.12)`,
    },
    selectHeading: {
      fontSize: '1.125rem',
      fontWeight: 700,
      color: theme.textWhite,
      marginBottom: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    dateRow: {
      display: 'flex',
      gap: '12px',
      overflowX: 'auto',
      justifyContent: 'center',
      paddingBottom: '6px',
    },
    dateButton: (active) => ({
      padding: '12px 24px',
      borderRadius: '12px',
      fontWeight: 700,
      whiteSpace: 'nowrap',
      cursor: 'pointer',
      transition: 'transform 140ms ease',
      backgroundImage: active ? 'linear-gradient(90deg,#7C3AED 0%, #db2777 100%)' : undefined,
      color: active ? '#fff' : '#cbd5e1',
      backgroundColor: active ? undefined : 'rgba(15,23,42,0.5)',
      border: 'none',
    }),
    timeRow: {
      display: 'flex',
      gap: '12px',
      flexWrap: 'wrap',
      justifyContent: 'center',
    },

    // seats
    seatsPanel: {
      backgroundColor: 'rgba(15,23,42,0.38)',
      borderRadius: '20px',
      padding: '24px',
      marginBottom: '24px',
      border: `1px solid rgba(124,58,237,0.12)`,
    },
    screenBar: {
      height: '8px',
      borderRadius: '999px',
      background: 'linear-gradient(to bottom, rgba(124,58,237,0.12), transparent)',
      marginBottom: '8px',
    },
    screenLabel: {
      textAlign: 'center',
      color: '#A78BFA',
      fontSize: '0.875rem',
      fontWeight: 700,
    },
    seatRow: {
      display: 'flex',
      justifyContent: 'center',
      gap: '8px',
      marginBottom: '8px',
      alignItems: 'center',
    },
    seatRowLabel: {
      width: '24px',
      color: '#A78BFA',
      fontWeight: 700,
    },
    seatButtonBase: {
      width: '32px',
      height: '32px',
      borderTopLeftRadius: '8px',
      borderTopRightRadius: '8px',
      fontSize: '0.75rem',
      fontWeight: 700,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: 'none',
      cursor: 'pointer',
      transition: 'transform 140ms ease',
    },
    legendRow: {
      display: 'flex',
      justifyContent: 'center',
      gap: '32px',
      marginTop: '20px',
      fontSize: '0.9rem',
    },
    legendBox: (bg) => ({
      width: '24px',
      height: '24px',
      backgroundColor: bg,
      borderRadius: '6px',
    }),

    // user details
    userPanel: {
      backgroundColor: 'rgba(15,23,42,0.38)',
      borderRadius: '20px',
      padding: '24px',
      marginBottom: '24px',
      border: `1px solid rgba(124,58,237,0.12)`,
    },
    inputsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(1,1fr)',
      gap: '12px',
    },
    inputBase: {
      backgroundColor: 'rgba(15,23,42,0.5)',
      color: '#fff',
      padding: '12px 16px',
      borderRadius: '12px',
      border: `1px solid rgba(124,58,237,0.12)`,
      outline: 'none',
    },

    // summary
    summaryPanel: {
      backgroundColor: 'rgba(124,58,237,0.12)',
      borderRadius: '20px',
      padding: '24px',
      marginBottom: '24px',
      border: `1px solid rgba(124,58,237,0.18)`,
    },
    summaryTop: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '12px',
    },
    priceText: {
      fontSize: '2rem',
      fontWeight: 700,
      color: theme.textWhite,
    },

    // payment
    paymentPanel: {
      backgroundColor: 'rgba(124,58,237,0.12)',
      borderRadius: '20px',
      padding: '24px',
      border: `1px solid rgba(124,58,237,0.18)`,
    },
    paymentGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2,1fr)',
      gap: '12px',
      marginBottom: '12px',
    },
    paymentOption: (active) => ({
      padding: '12px',
      borderRadius: '12px',
      border: active ? `2px solid ${theme.purple500}` : '2px solid rgba(15,23,42,0.5)',
      backgroundColor: active ? 'rgba(124,58,237,0.12)' : 'rgba(15,23,42,0.2)',
      cursor: 'pointer',
    }),

    // bookings page
    bookingsWrap: {
      minHeight: '100vh',
      width: '100%',
      backgroundImage: theme.bgGradientMain,
      padding: '24px',
      display: 'flex',
      justifyContent: 'center',
    },
    bookingsInner: {
      maxWidth: '960px',
      width: '100%',
    },
    bookingsTopRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '16px',
    },
    actionButton: {
      backgroundColor: '#2563eb',
      color: '#fff',
      padding: '8px 12px',
      borderRadius: '8px',
      border: 'none',
      cursor: 'pointer',
      display: 'inline-flex',
      gap: '8px',
      alignItems: 'center',
    },
    clearButton: {
      backgroundColor: '#dc2626',
      color: '#fff',
      padding: '8px 12px',
      borderRadius: '8px',
      border: 'none',
      cursor: 'pointer',
    },
    bookingsHeading: {
      fontSize: '2rem',
      fontWeight: 700,
      color: '#fff',
      marginBottom: '8px',
    },
    noBookings: {
      backgroundColor: 'rgba(15,23,42,0.38)',
      borderRadius: '20px',
      padding: '48px',
      textAlign: 'center',
      border: `1px solid rgba(124,58,237,0.12)`,
    },
    bookingCard: {
      backgroundColor: 'rgba(15,23,42,0.5)',
      borderRadius: '16px',
      padding: '20px',
      border: `1px solid rgba(124,58,237,0.18)`,
    },
    bookingGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2,1fr)',
      gap: '12px',
      backgroundColor: 'rgba(15,23,42,0.2)',
      borderRadius: '12px',
      padding: '12px',
    },
    badgeSuccess: {
      backgroundColor: 'rgba(16,185,129,0.16)',
      color: '#10b981',
      padding: '6px 10px',
      borderRadius: '999px',
      fontWeight: 700,
      fontSize: '0.875rem',
    },
  };

  // Responsive-ish tweak: change movieGrid columns at larger widths
  // Inline styles can't have media queries — but in many setups container width will cause natural wrapping.
  // To approximate, set grid to auto-fit using minmax if supported:
  styles.movieGridResponsive = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '24px',
  };

  const HomePage = () => (
    <div style={styles.pageContainer}>
      <div style={styles.headerOverlay}>
        <div style={styles.headerInner}>
          <div style={styles.logoTitle}>
            <Film size={32} style={{ color: theme.purple400 }} />
            <h1 style={styles.vojTitle}>VOJ</h1>
          </div>
          <nav style={styles.nav}>
            <button
              onClick={() => setCurrentPage('home')}
              style={styles.navButton}
              onMouseEnter={(e) => (e.currentTarget.style.color = theme.purple400)}
              onMouseLeave={(e) => (e.currentTarget.style.color = theme.textWhite)}
            >
              Home
            </button>
            <button
              onClick={() => setCurrentPage('bookings')}
              style={{ ...styles.navButton, display: 'flex', alignItems: 'center', gap: '8px' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = theme.purple400)}
              onMouseLeave={(e) => (e.currentTarget.style.color = theme.textWhite)}
            >
              <Database size={18} />
              Database
            </button>
          </nav>
        </div>
      </div>

      <div style={styles.mainContentWrap}>
        <div style={styles.pageHeading}>
          <h2 style={styles.headingH2}>Book Your Movie Experience</h2>
          <p style={styles.headingP}>Connected to Backend Database</p>
        </div>

        <div style={styles.movieGridResponsive}>
          {movies.map((movie) => {
            const isHovered = hoveredCard === movie.id;
            return (
              <div
                key={movie.id}
                style={{
                  ...styles.movieCard,
                  transform: isHovered ? 'scale(1.04)' : 'scale(1)',
                  boxShadow: isHovered ? '0 12px 30px rgba(0,0,0,0.5)' : 'none',
                }}
                onMouseEnter={() => setHoveredCard(movie.id)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <div style={styles.movieImageWrap}>
                  <img src={movie.image} alt={movie.title} style={styles.movieImage} />
                  <div style={styles.ratingBadge}>⭐ {movie.rating}</div>
                </div>
                <div style={styles.movieBody}>
                  <h3 style={styles.movieTitle}>{movie.title}</h3>
                  <div style={styles.movieMetaRow}>
                    <span style={styles.genrePill}>{movie.genre}</span>
                    <span style={{ color: '#cbd5e1' }}>{movie.duration}</span>
                  </div>
                  <p style={styles.movieDesc}>{movie.description}</p>
                  <div style={styles.buttonRow}>
                    <button
                      onClick={() => window.open(movie.trailer, '_blank')}
                      style={styles.primaryButton}
                      onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
                    >
                      Trailer
                    </button>
                    <button
                      onClick={() => {
                        setSelectedMovie(movie);
                        setCurrentPage('booking');
                        setSelectedDate('');
                        setSelectedTime('');
                        setSelectedSeats([]);
                        setShowPayment(false);
                      }}
                      style={styles.secondaryButton}
                      onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
                    >
                      Book
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const BookingPage = () => (
    <div style={styles.bookingPageWrap}>
      <div style={styles.bookingInner}>
        <button onClick={() => setCurrentPage('home')} style={styles.backButton}>
          ← Back
        </button>

        <div style={styles.panel}>
          <h2 style={styles.infoTitle}>{selectedMovie.title}</h2>
          <p style={styles.infoDesc}>{selectedMovie.description}</p>
          <div style={styles.grid2Cols}>
            <div style={{ color: '#cbd5e1' }}>
              <span style={{ color: theme.purple400, fontWeight: 700 }}>Genre: </span> {selectedMovie.genre}
            </div>
            <div style={{ color: '#cbd5e1' }}>
              <span style={{ color: theme.purple400, fontWeight: 700 }}>Price: </span> ₹{selectedMovie.price}/seat
            </div>
          </div>
        </div>

        <div style={styles.selectWrap}>
          <h3 style={styles.selectHeading}>
            <Calendar size={18} style={{ color: theme.purple400 }} /> Select Date
          </h3>
          <div style={styles.dateRow}>
            {dates.map((date) => (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                style={styles.dateButton(selectedDate === date)}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-3px)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
              >
                {date}
              </button>
            ))}
          </div>
        </div>

        <div style={styles.selectWrap}>
          <h3 style={styles.selectHeading}>
            <Clock size={18} style={{ color: theme.purple400 }} /> Select Time
          </h3>
          <div style={styles.timeRow}>
            {showTimes.map((time) => (
              <button
                key={time}
                onClick={() => setSelectedTime(time)}
                style={styles.dateButton(selectedTime === time)}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-3px)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
              >
                {time}
              </button>
            ))}
          </div>
        </div>

        {selectedDate && selectedTime && (
          <div style={styles.seatsPanel}>
            <h3 style={styles.selectHeading}>
              <Ticket size={18} style={{ color: theme.purple400 }} /> Select Seats
            </h3>

            <div style={{ marginBottom: '24px' }}>
              <div style={styles.screenBar}></div>
              <div style={styles.screenLabel}>SCREEN</div>
            </div>

            <div style={{ maxWidth: '720px', margin: '0 auto' }}>
              {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((row) => (
                <div key={row} style={styles.seatRow}>
                  <span style={styles.seatRowLabel}>{row}</span>
                  {seats
                    .filter((s) => s.row === row)
                    .map((seat) => {
                      const isBooked = seat.booked;
                      const isSelected = selectedSeats.includes(seat.id);
                      const hover = hoveredSeat === seat.id;
                      const seatStyle = {
                        ...styles.seatButtonBase,
                        backgroundColor: isBooked ? '#374151' : isSelected ? theme.green500 : '#1f2937',
                        color: isSelected ? '#fff' : '#cbd5e1',
                        cursor: isBooked ? 'not-allowed' : 'pointer',
                        transform: hover && !isBooked && !isSelected ? 'scale(1.08)' : 'scale(1)',
                      };
                      return (
                        <button
                          key={seat.id}
                          onClick={() => toggleSeat(seat.id)}
                          disabled={isBooked}
                          style={seatStyle}
                          onMouseEnter={() => setHoveredSeat(seat.id)}
                          onMouseLeave={() => setHoveredSeat(null)}
                        >
                          {seat.number}
                        </button>
                      );
                    })}
                </div>
              ))}
            </div>

            <div style={styles.legendRow}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={styles.legendBox('#374151')}></div>
                <span style={{ color: '#cbd5e1' }}>Available</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={styles.legendBox(theme.green500)}></div>
                <span style={{ color: '#cbd5e1' }}>Selected</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={styles.legendBox('#4b5563')}></div>
                <span style={{ color: '#cbd5e1' }}>Booked</span>
              </div>
            </div>
          </div>
        )}

        {selectedSeats.length > 0 && (
          <div style={styles.userPanel}>
            <h3 style={styles.selectHeading}>
              <User size={18} style={{ color: theme.purple400 }} /> Your Details
            </h3>
            <div style={styles.inputsGrid}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '12px' }}>
                <input
                  type="text"
                  placeholder="Full Name"
                  value={userInfo.name}
                  onChange={(e) => setUserInfo({ ...userInfo, name: e.target.value })}
                  style={styles.inputBase}
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={userInfo.email}
                  onChange={(e) => setUserInfo({ ...userInfo, email: e.target.value })}
                  style={styles.inputBase}
                />
                <input
                  type="tel"
                  placeholder="Phone"
                  value={userInfo.phone}
                  onChange={(e) => setUserInfo({ ...userInfo, phone: e.target.value })}
                  style={styles.inputBase}
                />
              </div>
            </div>
          </div>
        )}

        {selectedSeats.length > 0 && !showPayment && (
          <div style={styles.summaryPanel}>
            <div style={styles.summaryTop}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', margin: 0 }}>Summary</h3>
                <p style={{ color: theme.purple300 }}>Seats: {selectedSeats.join(', ')}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={styles.priceText}>₹{selectedMovie.price * selectedSeats.length}</p>
              </div>
            </div>
            <button
              onClick={handleBooking}
              style={{
                width: '100%',
                backgroundImage: 'linear-gradient(90deg,#16a34a 0%, #059669 100%)',
                color: '#fff',
                padding: '16px',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '1.125rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <CreditCard size={24} />
              Proceed to Payment
            </button>
          </div>
        )}

        {showPayment && (
          <div style={styles.paymentPanel}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>Payment Gateway</h3>
            <div style={styles.paymentGrid}>
              {['Razorpay', 'PhonePe', 'Google Pay', 'Paytm'].map((method) => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  style={styles.paymentOption(paymentMethod === method)}
                >
                  <h5 style={{ color: '#fff', fontWeight: 700, margin: 0 }}>{method}</h5>
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowPayment(false)} style={{ ...styles.secondaryButton, flex: 1 }}>
                Back
              </button>
              <button onClick={processPayment} style={{ ...styles.primaryButton, flex: 1 }}>
                Pay Now
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const BookingsPage = () => (
    <div style={styles.bookingsWrap}>
      <div style={styles.bookingsInner}>
        <div style={styles.bookingsTopRow}>
          <button onClick={() => setCurrentPage('home')} style={styles.backButton}>
            ← Back
          </button>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={fetchBookings} style={styles.actionButton}>
              <RefreshCw size={18} /> Refresh
            </button>
            <button onClick={clearDatabase} style={styles.clearButton}>
              Clear Database
            </button>
          </div>
        </div>

        <h2 style={styles.bookingsHeading}>Database Records</h2>
        <p style={{ color: theme.purple300, marginBottom: '24px' }}>Total Bookings: {bookings.length}</p>

        {loading ? (
          <div style={{ textAlign: 'center', color: '#fff', fontSize: '1.25rem' }}>Loading...</div>
        ) : bookings.length === 0 ? (
          <div style={styles.noBookings}>
            <Database size={64} style={{ color: theme.purple400, display: 'block', margin: '0 auto 12px' }} />
            <p style={{ color: '#9ca3af', fontSize: '1.125rem' }}>No bookings in database yet</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '24px' }}>
            {bookings.map((booking) => (
              <div key={booking.id} style={styles.bookingCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', margin: 0 }}>{booking.movie}</h3>
                    <p style={{ color: theme.purple300, margin: '6px 0' }}>Booking ID: #{booking.id}</p>
                    <p style={{ color: theme.textGray400, fontSize: '0.875rem' }}>{booking.timestamp}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#34d399' }}>₹{booking.totalPrice}</p>
                  </div>
                </div>

                <div style={styles.bookingGrid}>
                  <div>
                    <p style={{ color: '#A78BFA', fontSize: '0.875rem', fontWeight: 700, marginBottom: '6px' }}>Name</p>
                    <p style={{ color: '#fff' }}>{booking.name}</p>
                  </div>
                  <div>
                    <p style={{ color: '#A78BFA', fontSize: '0.875rem', fontWeight: 700, marginBottom: '6px' }}>Email</p>
                    <p style={{ color: '#fff' }}>{booking.email}</p>
                  </div>
                  <div>
                    <p style={{ color: '#A78BFA', fontSize: '0.875rem', fontWeight: 700, marginBottom: '6px' }}>Phone</p>
                    <p style={{ color: '#fff' }}>{booking.phone}</p>
                  </div>
                  <div>
                    <p style={{ color: '#A78BFA', fontSize: '0.875rem', fontWeight: 700, marginBottom: '6px' }}>Date</p>
                    <p style={{ color: '#fff' }}>{booking.date}</p>
                  </div>
                  <div>
                    <p style={{ color: '#A78BFA', fontSize: '0.875rem', fontWeight: 700, marginBottom: '6px' }}>Time</p>
                    <p style={{ color: '#fff' }}>{booking.time}</p>
                  </div>
                  <div>
                    <p style={{ color: '#A78BFA', fontSize: '0.875rem', fontWeight: 700, marginBottom: '6px' }}>Seats</p>
                    <p style={{ color: '#fff' }}>{Array.isArray(booking.seats) ? booking.seats.join(', ') : booking.seats}</p>
                  </div>
                  <div>
                    <p style={{ color: '#A78BFA', fontSize: '0.875rem', fontWeight: 700, marginBottom: '6px' }}>Payment</p>
                    <p style={{ color: '#fff' }}>{booking.paymentMethod}</p>
                  </div>
                  <div>
                    <p style={{ color: '#A78BFA', fontSize: '0.875rem', fontWeight: 700, marginBottom: '6px' }}>Status</p>
                    <span style={{ backgroundColor: 'rgba(16,185,129,0.12)', color: '#10b981', padding: '6px 10px', borderRadius: '999px', fontWeight: 700 }}>
                      {booking.paymentStatus}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ width: '100%' }}>
      {currentPage === 'home' && <HomePage />}
      {currentPage === 'booking' && selectedMovie && <BookingPage />}
      {currentPage === 'bookings' && <BookingsPage />}
    </div>
  );
};

export default VOJMovieBooking;

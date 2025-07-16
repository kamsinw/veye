import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
// import { io } from "socket.io-client";

// Use Vite proxy for API and WebSocket
const SHINOBI_BASE = "/api"; // Use proxy for dev
const MACHINE_ID = "veye-local"; // Can be any string
const USER_EMAIL = "veye@shinobi.video"; // Update with your actual Shinobi email
const USER_PASS = "kamkam1022"; // Update with your actual password

const App = () => {
  const [session, setSession] = useState(null);
  const [monitors, setMonitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [socket, setSocket] = useState(null);
  const [selectedMonitor, setSelectedMonitor] = useState(null);
  const [authToken, setAuthToken] = useState("");
  const [groupKey, setGroupKey] = useState("");
  const [motionLog, setMotionLog] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null); // For modal
  const [eventVideos, setEventVideos] = useState([]); // Video files for event
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const socketRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    const loginAndFetch = async () => {
      setLoading(true);
      setError("");
      try {
        // 1. Login to Shinobi
        const loginUrl = `${SHINOBI_BASE}/?json=true`;
        console.log("Login URL:", loginUrl);
        const loginRes = await axios.post(loginUrl, {
          machineID: MACHINE_ID,
          mail: USER_EMAIL,
          pass: USER_PASS,
          function: "dash",
        }, {
          headers: { 'Content-Type': 'application/json' }
        });

        const user = loginRes.data?.$user;
        if (!user || !user.ke || !user.auth_token || !user.uid) {
          throw new Error("Login failed: Invalid credentials or response.");
        }

        const { ke, auth_token, uid } = user;
        setSession({ ke, auth_token, uid });
        setAuthToken(auth_token);
        setGroupKey(ke);

        // 2. Fetch Monitors
        const monitorsUrl = `${SHINOBI_BASE}/${auth_token}/monitor/${ke}`;
        console.log("Monitors URL:", monitorsUrl);
        const monitorsRes = await axios.get(monitorsUrl, {
          headers: { 'Content-Type': 'application/json' }
        });

        const raw = monitorsRes.data;
        let monitorsArr = [];

        if (Array.isArray(raw.monitors)) {
          monitorsArr = raw.monitors;
        } else if (Array.isArray(raw)) {
          monitorsArr = raw;
        } else {
          monitorsArr = Object.values(raw.monitors || raw);
        }

        setMonitors(monitorsArr);

        // 3. Connect to WebSocket (commented out)
        /*
        const newSocket = io({
          path: "/api/socket.io", // Use proxy for WebSocket
        });

        newSocket.f = function (data) {
          if (!data.ke) data.ke = ke;
          if (!data.uid) data.uid = uid;
          return newSocket.emit("f", data);
        };

        newSocket.on("connect", () => {
          newSocket.f({
            f: "init",
            ke,
            auth: auth_token,
            uid,
          });
        });

        newSocket.on("f", (d) => {
          switch (d.f) {
            case "init_success":
              console.log("✅ Authenticated to WebSocket!");
              break;
            case "detector_trigger":
              // Only log if for selected monitor
              if (
                d.id &&
                (!selectedMonitor || d.id === selectedMonitor.id)
              ) {
                setMotionLog((prev) => [
                  { time: new Date().toLocaleTimeString(), ...d },
                  ...prev.slice(0, 49), // keep last 50
                ]);
              }
              break;
            case "onvif":
              console.log("🔍 ONVIF scan result:", d);
              break;
            default:
              // console.log("WS Message:", d);
          }
        });

        setSocket(newSocket);
        socketRef.current = newSocket;
        */
      } catch (err) {
        console.error("Login/Fetch error (full):", err);
        if (err.response) {
          console.error("Response data:", err.response.data);
          console.error("Response status:", err.response.status);
          console.error("Response headers:", err.response.headers);
        } else if (err.request) {
          console.error("No response received. Request:", err.request);
        }
        setError(err.message || JSON.stringify(err) || "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    loginAndFetch();

    return () => {
      /*
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      */
    };
    // eslint-disable-next-line
  }, []);

  // Watch for monitor selection to clear log and subscribe (commented out)
  /*
  useEffect(() => {
    if (!socket || !selectedMonitor) return;
    setMotionLog([]);
    socket.f({
      f: "monitor",
      ff: "watch_on",
      id: selectedMonitor.id,
    });
    return () => {
      socket.f({
        f: "monitor",
        ff: "watch_off",
        id: selectedMonitor.id,
      });
    };
  }, [socket, selectedMonitor]);
  */

  // HLS.js integration for browsers that don't support HLS natively
  useEffect(() => {
    if (!selectedMonitor) return;
    const video = videoRef.current;
    if (!video) return;
    const hlsUrl = selectedMonitor.url;
    // Check for native HLS support
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hlsUrl;
      return;
    }
    // Dynamically import hls.js
    let hls;
    import('hls.js').then(HlsModule => {
      const Hls = HlsModule.default;
      if (Hls.isSupported()) {
        hls = new Hls();
        hls.loadSource(hlsUrl);
        hls.attachMedia(video);
      }
    });
    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [selectedMonitor]);

  // Poll Shinobi API for motion events when a monitor is selected
  useEffect(() => {
    if (!selectedMonitor || !authToken || !groupKey) return;
    let intervalId;
    const fetchEvents = async () => {
      try {
        const url = `${SHINOBI_BASE}/${authToken}/events/${groupKey}/${selectedMonitor.id}`;
        const res = await axios.get(url, {
          headers: { 'Content-Type': 'application/json' }
        });
        // Shinobi returns an array of events or an object
        const events = Array.isArray(res.data) ? res.data : Object.values(res.data || {});
        setMotionLog(
          events.slice(-50).reverse().map(e => ({
            time: e.time || (e.timestamp ? new Date(e.timestamp * 1000).toLocaleTimeString() : ''),
            reason: e.reason || e.details || e.name || '',
            confidence: e.confidence || (e.matrices && e.matrices.confidence) || '',
            matrices: e.matrices || {},
            raw: e
          }))
        );
      } catch (err) {
        setMotionLog([{ time: '', reason: 'Error fetching events', confidence: '', matrices: {}, raw: { error: err.message || 'Error' } }]);
      }
    };
    fetchEvents();
    intervalId = setInterval(fetchEvents, 5000); // poll every 5s
    return () => clearInterval(intervalId);
  }, [selectedMonitor, authToken, groupKey]);

  // Fetch video files for a motion event
  const fetchEventVideos = async (evt) => {
    if (!evt || !selectedMonitor || !authToken || !groupKey) return;
    try {
      // Try to get a window around the event time
      let eventTime = evt.raw && evt.raw.time ? evt.raw.time : evt.raw && evt.raw.timestamp ? evt.raw.timestamp * 1000 : null;
      if (!eventTime && evt.time) {
        // evt.time is a string, try to parse
        const d = new Date(evt.time);
        if (!isNaN(d)) eventTime = d.getTime();
      }
      if (!eventTime) {
        setEventVideos([]);
        return;
      }
      // Shinobi expects ISO string, eventTime is ms
      const start = new Date(eventTime - 10000).toISOString().slice(0, 19); // 10s before
      const end = new Date(eventTime + 10000).toISOString().slice(0, 19); // 10s after
      const url = `${SHINOBI_BASE}/${authToken}/videos/${groupKey}/${selectedMonitor.id}?start=${start}&end=${end}`;
      const res = await axios.get(url, { headers: { 'Content-Type': 'application/json' } });
      let files = Array.isArray(res.data) ? res.data : Object.values(res.data || {});
      setEventVideos(files);
    } catch (err) {
      setEventVideos([]);
    }
  };

  // Handle click on motion log event
  const handleLogClick = (evt) => {
    setSelectedEvent(evt);
    setVideoModalOpen(true);
    setEventVideos([]);
    fetchEventVideos(evt);
  };

  return (
    <div style={{ padding: 32, background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ef 100%)', minHeight: '100vh', fontFamily: 'Inter, Arial, sans-serif' }}>
      <h2 style={{ fontWeight: 700, fontSize: 32, color: '#1a2233', marginBottom: 32, letterSpacing: 1 }}>Shinobi Monitors</h2>
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
          <div className="loader" style={{ border: '4px solid #e0e7ef', borderTop: '4px solid #4f8cff', borderRadius: '50%', width: 40, height: 40, animation: 'spin 1s linear infinite' }} />
        </div>
      ) : error ? (
        <div style={{ background: '#ffeaea', border: '1px solid #ffb3b3', color: '#b00', padding: 16, borderRadius: 8, marginBottom: 24 }}>
          <p style={{ margin: 0 }}>Error: {error}</p>
        </div>
      ) : monitors.length === 0 ? (
        <p style={{ color: '#888', fontSize: 18 }}>No monitors found.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexWrap: 'wrap', gap: 32 }}>
          {monitors.map((m, i) => {
            const monitorId = m.mid || m.id || m._id || i;
            const monitorName = m.name || m.mid || JSON.stringify(m);
            const videoUrl = `http://192.168.0.9:8080/7urCPl3uSor04HeTO4KAn1rH4BdTXd/hls/qJArcdxUpZ/fXL8lWLITC8000/s.m3u8`;
            const isSelected = selectedMonitor && selectedMonitor.id === monitorId;
            return (
              <li key={monitorId} style={{ minWidth: 340, background: '#fff', borderRadius: 14, boxShadow: '0 2px 16px #e0e7ef', padding: 24, marginBottom: 0, transition: 'box-shadow 0.2s', border: isSelected ? '2px solid #4f8cff' : '2px solid #f0f4fa' }}>
                <button
                  style={{ background: isSelected ? '#4f8cff' : 'none', border: 'none', color: isSelected ? '#fff' : '#4f8cff', textDecoration: 'none', cursor: 'pointer', padding: '8px 0', fontSize: 18, fontWeight: 600, borderRadius: 6, width: '100%', transition: 'background 0.2s, color 0.2s' }}
                  onClick={() => setSelectedMonitor({ id: monitorId, name: monitorName, url: videoUrl })}
                >
                  {monitorName}
                </button>
                {isSelected && (
                  <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-start', gap: 28 }}>
                    <video
                      ref={videoRef}
                      controls
                      autoPlay
                      muted
                      style={{ width: 420, height: 240, border: '2px solid #4f8cff', borderRadius: 10, background: '#000', objectFit: 'cover', boxShadow: '0 2px 8px #e0e7ef' }}
                    >
                      Sorry, your browser does not support embedded videos.
                    </video>
                    <div style={{ width: 320, maxHeight: 240, overflowY: 'auto', background: '#f8fafc', border: '1px solid #e0e7ef', borderRadius: 10, padding: 16, boxShadow: '0 2px 8px #e0e7ef' }}>
                      <h4 style={{ margin: 0, marginBottom: 10, fontWeight: 600, color: '#1a2233', fontSize: 18 }}>Motion Log</h4>
                      {motionLog.length === 0 ? (
                        <div style={{ color: '#aaa', fontSize: 15, textAlign: 'center', marginTop: 40 }}>No motion events yet.</div>
                      ) : (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                          {motionLog.map((evt, idx) => (
                            <li
                              key={idx}
                              style={{ fontSize: 14, marginBottom: 10, background: '#eaf1fb', borderRadius: 6, padding: '7px 10px', marginLeft: 0, marginRight: 0, boxShadow: '0 1px 3px #e0e7ef', cursor: 'pointer', border: selectedEvent === evt ? '2px solid #4f8cff' : 'none' }}
                              onClick={() => handleLogClick(evt)}
                              title="Click to view video playback for this event"
                            >
                              <div>
                                <span style={{ color: '#4f8cff', fontWeight: 600 }}>
                                  {evt.time ? evt.time : 'Unknown Time'}
                                </span>
                                {evt.confidence !== '' && (
                                  <span style={{ color: '#222', marginLeft: 10 }}>
                                    Confidence: <b>{typeof evt.confidence === 'object' ? JSON.stringify(evt.confidence) : evt.confidence}</b>
                                  </span>
                                )}
                                {evt.reason && (
                                  <span style={{ color: '#b00', marginLeft: 10 }}>
                                    Reason: {typeof evt.reason === 'object' ? JSON.stringify(evt.reason) : evt.reason}
                                  </span>
                                )}
                                {evt.matrices && Object.keys(evt.matrices).length > 0 && (
                                  <span style={{ color: '#555', display: 'block', marginLeft: 10, fontSize: 13 }}>
                                    Matrices: {Object.entries(evt.matrices).map(([k, v]) => `${k}: ${v}`).join(', ')}
                                  </span>
                                )}
                                {evt.raw && evt.raw.details && typeof evt.raw.details === 'object' && (
                                  <span style={{ color: '#888', display: 'block', marginLeft: 10, fontSize: 13 }}>
                                    Details: {Object.entries(evt.raw.details).map(([k, v]) => `${k}: ${v}`).join(', ')}
                                  </span>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {/* Video Modal */}
      {videoModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(30,40,60,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 4px 32px #1a223355', padding: 32, minWidth: 420, minHeight: 280, position: 'relative', maxWidth: 600 }}>
            <button onClick={() => setVideoModalOpen(false)} style={{ position: 'absolute', top: 18, right: 18, background: '#4f8cff', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontWeight: 600, fontSize: 16, cursor: 'pointer', zIndex: 2 }}>Close</button>
            <h3 style={{ margin: 0, marginBottom: 18, color: '#1a2233', fontWeight: 700, fontSize: 22 }}>Event Video Playback</h3>
            {eventVideos.length === 0 ? (
              <div style={{ color: '#888', fontSize: 16, marginTop: 40, textAlign: 'center' }}>Loading or no video found for this event.</div>
            ) : (
              <video
                controls
                autoPlay
                style={{ width: '100%', maxWidth: 520, height: 300, borderRadius: 10, background: '#000', objectFit: 'cover', boxShadow: '0 2px 8px #e0e7ef' }}
                src={`${SHINOBI_BASE}/${authToken}/videos/${groupKey}/${selectedMonitor.id}/${eventVideos[0].filename}`}
              >
                Sorry, your browser does not support embedded videos.
              </video>
            )}
            {eventVideos.length > 1 && (
              <div style={{ marginTop: 12, color: '#4f8cff', fontSize: 14 }}>
                Multiple videos found. Showing the first. <br />
                <span style={{ color: '#888', fontSize: 13 }}>Files: {eventVideos.map(f => f.filename).join(', ')}</span>
              </div>
            )}
          </div>
        </div>
      )}
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default App;




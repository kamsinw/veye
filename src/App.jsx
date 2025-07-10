import React, { useEffect, useState } from 'react';
import axios from 'axios';

const SHINOBI_API = import.meta.env.VITE_SHINOBI_API;
const GROUP_KEY = import.meta.env.VITE_GROUP_KEY;
const API_KEY = import.meta.env.VITE_API_KEY;

export default function App() {
  const [monitors, setMonitors] = useState([]);

  useEffect(() => {
    axios
      .get(`${SHINOBI_API}/${GROUP_KEY}/monitor/${API_KEY}.json`)
      .then((res) => setMonitors(res.data))
      .catch((err) => console.error('Failed to fetch monitors', err));
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-2xl font-bold mb-4">Veye Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {monitors.map((monitor) => (
          <div key={monitor.mid} className="rounded-xl overflow-hidden shadow-lg bg-black">
            <h2 className="text-lg font-semibold p-2 bg-gray-800">{monitor.name}</h2>
            <img
              src={`${SHINOBI_API}/${GROUP_KEY}/${monitor.mid}/mjpeg/${API_KEY}`}
              alt={`Stream ${monitor.name}`}
              className="w-full h-64 object-cover"
            />
          </div>
        ))}
      </div>
    </div>
  );
}



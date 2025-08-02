
---

# Veye: Modular 4G-Enabled Home Security Platform

**Veye** is a modular, ONVIF-compatible home security platform designed to support real-time surveillance and intelligent detection through 4G-enabled IP cameras. The system integrates with open-source NVR software, supports AI-based event detection using YOLOv8, and is optimized for both edge and cloud processing.

## 🔧 Features

* **4G-Enabled Connectivity**: Seamless remote deployment using VITEL 4G SIMs — no Wi-Fi required.
* **ONVIF Compatibility**: Supports a wide range of IP cameras out-of-the-box.
* **Real-Time NVR Integration**: Built on Shinobi NVR with Node.js and Docker for scalable video stream handling.
* **Intelligent Detection**: Human, vehicle, and weapon detection powered by YOLOv8.(In dev)
* **Cloud + Edge Architecture**: Optimized inference on both local devices and cloud instances.
* **Modular Design**: Built for future support of web/mobile frontends and expanded camera types.

## 📦 Tech Stack

| Component           | Technology Used                                          |
| ------------------- | -------------------------------------------------------- |
| NVR System          | [Shinobi CCTV](https://shinobi.video/) (Node.js, Docker) |
| AI Detection        | YOLOv8 (Ultralytics)                                     |
| Backend Integration | Node.js, REST API                                        |
| Deployment          | Docker Compose                                           |
| Camera Interface    | ONVIF protocol                                           |
| Connectivity        | VITEL 4G SIM-enabled cameras                             |



## 🚀 Getting Started

### Prerequisites

* Docker & Docker Compose
* Node.js (v16+)
* 4G-enabled IP camera (ONVIF-compatible)
* VITEL SIM & network access

### Installation

1. **Clone the repo:**

```bash
git clone https://github.com/your-username/veye.git
cd veye
```

2. **Configure Shinobi:**

Ensure `conf.json` and camera credentials are set correctly in `config/`.

3. **Start the system:**

```bash
docker-compose up --build
```

4. **Access Shinobi UI:**

Visit `http://localhost:8080` (or your server IP)
Default Admin Login:

* Username: `admin@shinobi.video`
* Password: `admin`

5. **Connect Cameras:**

Use Shinobi’s UI to connect ONVIF-compatible cameras using the 4G IP address.

## 🤖 AI Detection (YOLOv8)

Detection is performed on frames using YOLOv8 in either:

* **Edge Mode** (e.g., Jetson Nano, Raspberry Pi): `/edge/infer.py`
* **Cloud Mode**: Running a Flask/FastAPI wrapper for batch processing

To run detection locally:

```bash
cd ai
python detect.py --source rtsp://camera-ip/stream --model yolov8n.pt
```

## 🔐 Security

All camera streams and APIs are designed to be behind authenticated routes (pending full auth integration). Consider setting up NGINX reverse proxy + TLS for production use.

## 🛣️ Roadmap

* [ ] Mobile/web frontend for live view + alerts
* [ ] Motion-based recording optimization
* [ ] Alert system via SMS/Email
* [ ] Admin dashboard
* [ ] Cloud object storage integration (e.g., S3)

## 🧠 AI Model Details

| Class   | Included                  |
| ------- | ------------------------- |
| Person  | ✅                         |
| Vehicle | ✅                         |
| Weapon  | ✅ (custom-trained subset) |

YOLOv8 models can be swapped or fine-tuned in the `ai/models` directory.



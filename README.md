# MicroHelio 

MicroHelio is a comprehensive microgrid energy management platform designed to facilitate secure, transparent, and efficient energy transfers between solar prosumers and localized microgrid battery nodes. The system provides a seamless end-to-end operational workflow where prosumers discover nearby battery stations, reserve energy transfer slots, and execute secure transactions using HMAC-SHA256 signed QR payloads. 

MicroHelio serves dual operational roles: a **Native Android Mobile Application** for on-the-go prosumers and field operators, and a **React-based Web Portal** for backoffice administration, reservation approvals, and live grid monitoring.

---

## Key Features

* **Cryptographic Energy Transactions**: Employs HMAC-SHA256 signed QR codes to verify prosumer reservations and execute energy transfers, preventing payload tampering and cross-timezone verification failures.
* **Smart Capacity Management**: Enforces slot availability rules, 7-day advance booking windows, and 12-hour modification limits for microgrid battery node capacity.
* **Operator Verification Dashboard**: Provides grid operators with live dashboards to monitor node capacities, approve pending prosumer bookings, scan QR codes in portrait camera mode, and finalize energy transfers (`kWh`).
* **Offline-Capable Mobile Experience**: Leverages local SQLite database caching to enable prosumers and operators to inspect history logs, booking details, and offline transaction records even in low-connectivity environments.
* **Role-Based Security**: Strict operational permissions across **Backoffice Administrators** (user activation and system management), **Grid Operators** (reservation approvals, QR scanning, transfer completion), and **Prosumers** (mobile slot reservations, profile management).
* **Automated CI/CD Pipeline**: GitHub Actions workflows for continuous integration, automated unit testing (xUnit/Moq), and production build validation.

---

## Repository Architecture

```text
microhelio/
├── web-service/           # .NET 8 Web API & Service Layer
│   ├── MicroHelio/        # Controllers, DTOs, Services, Models & MongoDB integration
│   └── MicroHelio.Tests/  # xUnit & Moq Unit Test Suite
├── web-app/               # React.js & Vite Web Dashboard
│   ├── src/               # UI Components, Pages, Nav, Context & API client
│   └── public/            # Static assets
└── mobile-app/            # Native Android App (Kotlin)
    ├── app/               # ZXing CameraX QR scanner, Retrofit API client, SQLite
    └── local.properties   # Environment configuration for backend API host & port
```

---

## Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Backend API** | C# .NET 8 Web API, MongoDB, JWT Authentication, HMAC-SHA256 Security |
| **Testing & CI** | xUnit, Moq, GitHub Actions CI Workflow |
| **Web Portal** | React.js, Vite, Vanilla CSS |
| **Mobile App** | Android (Kotlin), Retrofit2, OkHttp3, ZXing Embedded, CameraX, SQLite |
| **Infrastructure** | IIS Web Server / Kestrel, MongoDB Atlas / Local MongoDB |

---

## Getting Started

### Prerequisites

* [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
* [Node.js](https://nodejs.org/) (v18 or newer)
* [Android Studio](https://developer.android.com/studio) (Jellyfish or newer)
* [MongoDB](https://www.mongodb.com/) (Local instance on port 27017 or MongoDB Atlas URI)

---

### 1. Backend Web API Setup (.NET 8)

1. Navigate to the `web-service/MicroHelio` directory.
2. Update `appsettings.json` with your MongoDB connection string and a secret key:
   ```json
   {
     "Jwt": {
       "Key": "YourSuperSecretHMACKeyThatIsAtLeast32BytesLong!"
     },
     "MicroHelioDatabase": {
       "ConnectionString": "mongodb://localhost:27017",
       "DatabaseName": "MicroHelioDb"
     }
   }
   ```
3. Restore dependencies and launch the backend API:
   ```bash
   dotnet restore web-service/MicroHelio.sln
   dotnet run --project web-service/MicroHelio/MicroHelio.csproj
   ```
   *The API runs by default at `http://localhost:5056` (Swagger documentation at `http://localhost:5056/swagger`).*

4. *(Optional)* Run unit tests:
   ```bash
   dotnet test web-service/MicroHelio.sln --configuration Release
   ```

---

### 2. Web Application Setup (React + Vite)

1. Navigate to the `web-app` directory:
   ```bash
   cd web-app
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in `web-app/`:
   ```env
   VITE_API_URL=http://localhost:5056/api
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
   *Access the web portal at `http://localhost:5174` (or `http://localhost:5173`).*

---

### 3. Mobile Application Setup (Android Kotlin)

1. Open the `mobile-app` directory in **Android Studio**.
2. Create or verify `local.properties` in `mobile-app/`:
   ```properties
   sdk.dir=C\:\\Users\\<YourUsername>\\AppData\\Local\\Android\\Sdk
   api.host=localhost
   api.port=5056
   ```

3. **Connecting Mobile Devices**:
   * **Android Studio Emulator**: Automatically maps `localhost` to `10.0.2.2:5056` host loopback.
   * **Physical Android Device (via USB)**: Run port forwarding in your terminal:
     ```bash
     adb reverse tcp:5056 tcp:5056
     ```
   * **Physical Device over Wi-Fi / IIS LAN**: Set `api.host` in `local.properties` to your host machine's LAN IP address (e.g. `api.host=192.168.1.X`).

4. Build and run the project on your target device/emulator.



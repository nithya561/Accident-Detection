# SafeGuard: AI-Powered Accident Detection and Alert System

SafeGuard is a smart application designed to automatically detect car accidents from a live video feed and immediately alert a primary contact. It leverages AI-powered image analysis to determine if a crash has occurred and uses Twilio to send SMS messages and initiate voice calls to a pre-configured emergency contact number.

## Key Features

- **Live Accident Detection:** Utilizes a camera feed to continuously monitor for signs of a car accident in real-time.
- **AI-Powered Analysis:** Employs a Genkit AI flow with a Google Gemini model to analyze video frames and accurately identify accidents.
- **Automated Alerts:** Instantly sends an SMS and places a voice call to an emergency contact when an accident is detected.
- **Manual Emergency Trigger:** A large, accessible "MANUAL EMERGENCY" button allows users to trigger alerts themselves if needed.
- **Auto-Detection Toggle:** A simple switch to enable or disable the automatic detection feature.
- **Video Upload:** Users can upload a video file for analysis if a live feed is not available.
- **Automatic System Reset:** The system automatically resets 30 seconds after an alert is sent, preparing it to monitor for new incidents.
- **Configurable Contacts:** Easily set your Twilio phone number (for sending alerts) and your primary contact's number (for receiving them) directly in the UI.

## Technology Stack

- **Framework:** [Next.js](https://nextjs.org/) (with App Router)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **UI:** [React](https://reactjs.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **UI Components:** [ShadCN UI](https://ui.shadcn.com/)
- **AI/Generative:** [Firebase Genkit](https://firebase.google.com/docs/genkit) with Google Gemini
- **Communication:** [Twilio API](https://www.twilio.com/) for SMS and Voice Calls

## Setup and Configuration

To run this application, you need to configure your Twilio credentials.

### 1. Create a `.env.local` file

Create a new file named `.env.local` in the root of the project directory.

### 2. Add Twilio Credentials

You need to provide your Twilio Account SID and Auth Token in the `.env.local` file.

```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
```

You can find your **Account SID** and **Auth Token** on your [Twilio Console Dashboard](https://www.twilio.com/console).

### 3. Get a Twilio Phone Number

The application requires a Twilio phone number to send alerts *from*.

- **Free Trial:** Your Twilio free trial includes a free number.
- **Purchase a Number:** If you've used your trial number, you must purchase one. It's crucial that this number has SMS and Voice capabilities enabled for the countries you intend to contact.
- You can get a number from the [**Phone Numbers** section of your Twilio Console](https://www.twilio.com/console/phone-numbers/incoming).

## How to Use

1.  **Launch the Application:** Run the app locally or access it via its deployed URL.
2.  **Allow Camera Access:** The browser will prompt you for camera permission. Allow it to enable the live video feed.
3.  **Configure Numbers in the UI:**
    - **Your Twilio Phone Number (From):** In the "Emergency Setup" card, enter the Twilio phone number you acquired. It must be in E.164 format (e.g., `+13253125474`).
    - **Primary Contact Number (To):** Enter the phone number of the person you want to alert in an emergency. This also must be in E.164 format (e.g., `+919876543210`).
4.  **Enable Auto-Detection:**
    - Toggle the "Enable Auto-Detection" switch.
    - The system will now automatically analyze the live feed. If it detects an accident, it will immediately send an SMS and place a call to your primary contact.
5.  **Manual Activation:**
    - In case of an emergency that the system doesn't detect, press the large "MANUAL EMERGENCY" button at the bottom of the page. This will trigger the alerts instantly.
6.  **Upload a Video:**
    - If you want to analyze a pre-recorded video, click the "Upload Video" button and select a file. Once loaded, click "Detect Accident from Video".

## Genkit AI Flows

The core AI logic is handled by three Genkit flows located in `src/ai/flows/`:

-   `accident-analysis.ts`: Takes a video frame as a Base64-encoded image and uses the Gemini model to determine if it depicts a car accident.
-   `send-sms-flow.ts`: Connects to the Twilio API to send a pre-defined SMS message.
-   `make-call-flow.ts`: Connects to the Twilio API to initiate a voice call with a text-to-speech message.

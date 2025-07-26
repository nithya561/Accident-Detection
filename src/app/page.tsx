
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { analyzeAccident, type AccidentAnalysisOutput } from "@/ai/flows/accident-analysis";
import { sendSms } from "@/ai/flows/send-sms-flow";
import { makeCall } from "@/ai/flows/make-call-flow";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, ShieldCheck, Phone, MessageSquare, Loader2, Settings, Video, AlertCircle, Upload, CircleCheck, ExternalLink } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"


export default function SafeGuardPage() {
  const [primaryContact, setPrimaryContact] = useState("+919380731506");
  const [inputContact, setInputContact] = useState("+919380731506");
  const [twilioFromNumber, setTwilioFromNumber] = useState("+13253125474");
  const [inputFromNumber, setInputFromNumber] = useState("+13253125474");
  const [isDetecting, setIsDetecting] = useState(false);
  const [accidentStatus, setAccidentStatus] = useState<AccidentAnalysisOutput | null>(null);
  const [isEmergency, setIsEmergency] = useState(false);
  const [isAlerting, setIsAlerting] = useState(false);
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [showEmergencyDialog, setShowEmergencyDialog] = useState(false);
  const alertTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const resetTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);


  const resetSystem = useCallback(() => {
    console.log("Resetting system...");
    setAccidentStatus(null);
    setIsEmergency(false);
    setIsAlerting(false);
    setShowEmergencyDialog(false);
    if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
    if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);

    toast({
        title: "System Reset",
        description: "Monitoring for new incidents.",
    });
  }, [toast]);
  
  const triggerAlerts = useCallback(async (reason?: string) => {
    if (!primaryContact) {
      toast({
        variant: "destructive",
        title: "No Contact Set",
        description: "Please set a primary contact number before triggering an alert.",
      });
      return;
    }

    if (!twilioFromNumber) {
      toast({
          variant: "destructive",
          title: "Twilio Number Not Set",
          description: "Please set your Twilio phone number in the Emergency Setup section.",
      });
      return;
    }

    if (isAlerting) return; 

    setIsAlerting(true);
    setShowEmergencyDialog(true);
    setIsAutoDetecting(false); // Turn off auto-detection after an alert

    const alertReason = reason || "Manual emergency activation.";
    const messageBody = `URGENT: An accident may have been detected involving your contact. Reason: ${alertReason}. Please check on them immediately.`;
    const callMessage = `Hello. This is an automated alert from SafeGuard. An accident may have been detected. Reason: ${alertReason}. Please check on your contact immediately.`;
    
    setAccidentStatus({ isAccident: true, confidence: 1, reason: alertReason });

    try {
        await sendSms({ to: primaryContact, from: twilioFromNumber, body: messageBody });
        toast({ title: "SMS Sent Successfully", description: `Message sent to ${primaryContact}` });
    } catch (error: any) {
        console.error("SMS sending failed:", error);
        toast({ variant: "destructive", title: "SMS Failed", description: `Could not send SMS alert: ${error.message}` });
    }
    
    try {
        await makeCall({ to: primaryContact, from: twilioFromNumber, message: callMessage });
        toast({ title: "Call Initiated Successfully", description: `Calling ${primaryContact}` });
    } catch (error: any) {
        console.error("Call initiation failed:", error);
        toast({ variant: "destructive", title: "Call Failed", description: `Could not initiate call alert: ${error.message}` });
    }

    toast({
        title: "Automatic Reset Initiated",
        description: "The system will reset in 30 seconds.",
    });

    resetTimeoutRef.current = setTimeout(resetSystem, 30000);
    
  }, [primaryContact, twilioFromNumber, toast, isAlerting, resetSystem]);


  const runDetection = useCallback(async () => {
    if (!videoRef.current || (!hasCameraPermission && !videoSrc) || isDetecting || isAlerting) {
        return;
    }

    if (videoSrc && videoRef.current.paused) {
      await videoRef.current.play().catch(e => console.error("Error playing video:", e));
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));


    setIsDetecting(true);
    setAccidentStatus(null);
    setIsEmergency(false);

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        toast({ variant: "destructive", title: "Could not process video frame." });
        setIsDetecting(false);
        return;
    }
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const frameDataUri = canvas.toDataURL("image/jpeg");

    try {
      const result = await analyzeAccident({ photoDataUri: frameDataUri });
      if (result.isAccident) {
        await triggerAlerts(result.reason);
      } else {
        setAccidentStatus(result);
        toast({
            title: "No Accident Detected",
            description: result.reason,
        });
      }
    } catch (error) {
      console.error("AI analysis failed:", error);
      toast({
        variant: "destructive",
        title: "Detection Failed",
        description: "Could not analyze the video footage. The AI model may have returned an unexpected format.",
      });
    } finally {
      setIsDetecting(false);
    }
  }, [videoRef, hasCameraPermission, videoSrc, isDetecting, isAlerting, toast, triggerAlerts]);

  const setupCameraStream = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error("Camera API not available in this browser.");
      setHasCameraPermission(false);
      toast({
          variant: "destructive",
          title: "Unsupported Browser",
          description: "Your browser does not support camera access, which is required for this app.",
      });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setHasCameraPermission(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.src = ""; // Clear src if we are using srcObject
        setVideoSrc(null);
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      setHasCameraPermission(false);
      toast({
        variant: "destructive",
        title: "Camera Access Denied",
        description: "Please enable camera permissions in your browser settings to use this app.",
      });
    }
  }, [toast]);

  useEffect(() => {
    setupCameraStream();
     return () => {
      if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
      if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
    };
  }, [setupCameraStream]);

  const canDetect = (hasCameraPermission || !!videoSrc) && !isAlerting;

  useEffect(() => {
    let detectionInterval: NodeJS.Timeout | null = null;
    if (isAutoDetecting && canDetect && hasCameraPermission) {
      detectionInterval = setInterval(() => {
        runDetection();
      }, 5000); // Run detection every 5 seconds
    }
    return () => {
      if (detectionInterval) {
        clearInterval(detectionInterval);
      }
    };
  }, [isAutoDetecting, canDetect, runDetection, hasCameraPermission]);


  const handleSetContact = () => {
    if (inputContact && /^\+?[1-9]\d{1,14}$/.test(inputContact)) {
        setPrimaryContact(inputContact);
        toast({
            title: "Contact Updated",
            description: `Primary contact set to ${inputContact}.`,
        });
    } else {
        toast({
            variant: "destructive",
            title: "Invalid Phone Number",
            description: "Please enter a valid phone number in E.164 format (e.g., +15551234567).",
        });
    }
  };
  
  const handleSetFromNumber = () => {
    if (inputFromNumber && /^\+?[1-9]\d{1,14}$/.test(inputFromNumber)) {
        setTwilioFromNumber(inputFromNumber);
        toast({
            title: "Twilio Number Updated",
            description: `Twilio 'From' number set to ${inputFromNumber}.`,
        });
    } else {
        toast({
            variant: "destructive",
            title: "Invalid Phone Number",
            description: "Please enter a valid Twilio phone number in E.164 format.",
        });
    }
  };
  
  const handleManualEmergency = () => {
    if (isAlerting) return;
    setIsEmergency(true);
    triggerAlerts("Manual activation by user.");
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && videoRef.current) {
        const url = URL.createObjectURL(file);
        setVideoSrc(url);
        setIsAutoDetecting(false); // Disable auto-detect for uploaded files
        videoRef.current.srcObject = null;
        videoRef.current.src = url;
        videoRef.current.controls = true;
        videoRef.current.muted = false;
        setHasCameraPermission(null); 
    }
  };

  const getStatus = () => {
    if (isDetecting) return { text: "Detecting accident...", color: "text-amber-500", icon: <Loader2 className="h-5 w-5 mr-2 animate-spin" /> };
    if (isAlerting) return { text: "Alerts sent! System will reset automatically.", color: "text-blue-600", icon: <CircleCheck className="h-5 w-5 mr-2" /> };
    if (accidentStatus && !accidentStatus.isAccident) return { text: `Analysis complete. No accident found.`, color: "text-green-600", icon: <ShieldCheck className="h-5 w-5 mr-2" /> };
    if (isAutoDetecting) return { text: "Auto-detection active. Monitoring live feed...", color: "text-blue-600", icon: <Loader2 className="h-5 w-5 mr-2 animate-spin" /> };
    if (videoSrc) return { text: "Video loaded. Ready for manual detection.", color: "text-blue-600" };
    if(hasCameraPermission === false && !videoSrc) return { text: "Camera not available. Upload a video.", color: "text-amber-500" };
    if(hasCameraPermission === true && !videoSrc) return { text: "Live feed active. Ready for detection.", color: "text-green-600" };
    return { text: "All Systems Normal. Ready for detection.", color: "text-green-600" };
  };

  const status = getStatus();
  const isAlertActive = isEmergency || isAlerting;

  return (
    <>
      <AlertDialog open={showEmergencyDialog} onOpenChange={setShowEmergencyDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="text-destructive" />
              Emergency Alert Triggered!
            </AlertDialogTitle>
            <AlertDialogDescription>
              Sending SMS and initiating a call to {primaryContact}. The system will reset automatically in 30 seconds.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center gap-4 py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p>Contacting emergency services and resetting...</p>
          </div>
          <AlertDialogFooter>
            <Button onClick={resetSystem}>Reset System Now</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex flex-col min-h-screen bg-background text-foreground">
        <header className="p-4 border-b shadow-sm">
          <div className="container mx-auto flex items-center gap-3">
              <ShieldCheck className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold font-headline">SafeGuard</h1>
          </div>
        </header>

        <main className="flex-grow container mx-auto p-4 md:p-8">
          <div className="grid md:grid-cols-2 gap-8 items-start">
            
            <Card className="w-full shadow-md">
              <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xl">
                        <Video className="h-6 w-6" />
                        Video Feed
                      </div>
                       <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                          <Upload className="mr-2 h-4 w-4" />
                          Upload Video
                      </Button>
                      <input 
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          className="hidden"
                          accept="video/*"
                      />
                  </CardTitle>
                  <CardDescription>{videoSrc ? "Video uploaded. Press 'Detect Accident' below." : "Live feed for accident detection."}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-muted rounded-md overflow-hidden flex items-center justify-center relative">
                    <video 
                      ref={videoRef} 
                      className="w-full h-full object-cover" 
                      autoPlay 
                      muted={!videoSrc} 
                      playsInline 
                      loop={!!videoSrc}
                    />
                    {!videoSrc && hasCameraPermission === false && (
                         <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white p-4">
                              <AlertCircle className="h-8 w-8 mb-2" />
                              <p className="text-center font-semibold">Camera permission denied.</p>
                              <p className="text-center text-sm">Please enable camera access or upload a video.</p>
                         </div>
                    )}
                     {!videoSrc && hasCameraPermission === null && (
                         <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white">
                              <Loader2 className="h-8 w-8 animate-spin" />
                              <p>Requesting camera...</p>
                         </div>
                    )}
                </div>
              </CardContent>
               <CardFooter className="flex flex-col sm:flex-row items-center gap-4 pt-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="auto-detection-switch"
                      checked={isAutoDetecting}
                      onCheckedChange={setIsAutoDetecting}
                      disabled={!hasCameraPermission || isAlertActive || !!videoSrc}
                    />
                    <Label htmlFor="auto-detection-switch">Enable Auto-Detection</Label>
                  </div>
                  {videoSrc && (
                    <Button onClick={runDetection} disabled={isDetecting || isAlerting}>
                        {isDetecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Detect Accident from Video
                    </Button>
                  )}
                  {isAlertActive && (
                      <Button onClick={resetSystem} variant="outline">Reset System Now</Button>
                  )}
                </CardFooter>
            </Card>
            
            <div className="space-y-8">
              <Card className="w-full shadow-md">
                  <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                      <Settings className="h-6 w-6" />
                      Emergency Setup
                  </CardTitle>
                  <CardDescription>Set your Twilio and emergency contact phone numbers.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                  <div className="space-y-2">
                      <Label htmlFor="from-number">Your Twilio Phone Number (From)</Label>
                      <div className="flex gap-2">
                      <Input 
                          id="from-number" 
                          type="tel" 
                          placeholder="Your Twilio Number"
                          value={inputFromNumber}
                          onChange={(e) => setInputFromNumber(e.target.value)}
                      />
                      <Button onClick={handleSetFromNumber}>Save</Button>
                      </div>
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="contact-number">Primary Contact Number (To)</Label>
                      <div className="flex gap-2">
                      <Input 
                          id="contact-number" 
                          type="tel" 
                          placeholder="+15551234567"
                          value={inputContact}
                          onChange={(e) => setInputContact(e.target.value)}
                      />
                      <Button onClick={handleSetContact}>Save</Button>
                      </div>
                  </div>
                  </CardContent>
                  <CardFooter className="flex-col items-start gap-2">
                      {twilioFromNumber ? (
                          <p className="text-sm text-muted-foreground">Current Twilio number: <span className="font-semibold text-foreground">{twilioFromNumber}</span></p>
                      ) : (
                          <p className="text-sm text-destructive">Twilio 'From' number not set.</p>
                      )}
                      {primaryContact ? (
                          <p className="text-sm text-muted-foreground">Current contact: <span className="font-semibold text-foreground">{primaryContact}</span></p>
                      ) : (
                          <p className="text-sm text-destructive">No primary contact set.</p>
                      )}
                  </CardFooter>
              </Card>

              <Card className="w-full shadow-md">
                  <CardHeader>
                  <CardTitle className="text-xl">System Status</CardTitle>
                  <CardDescription>Real-time status of the accident detection system.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                  <div className={`flex items-center text-lg font-semibold ${status.color}`}>
                      {status.icon}
                      {status.text}
                  </div>
                  {accidentStatus?.reason && (
                      <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md border">
                          <strong>AI Analysis:</strong> {accidentStatus.reason}
                      </p>
                  )}
                  </CardContent>
              </Card>
            </div>
          </div>

          <div className="mt-12 text-center">
              <Button 
                  onClick={handleManualEmergency} 
                  className="bg-accent hover:bg-accent/90 text-accent-foreground h-20 w-full max-w-sm text-xl rounded-lg shadow-lg transform hover:scale-105 transition-transform duration-200"
                  disabled={isDetecting || isAlertActive}
                  aria-label="Activate manual emergency"
              >
                  <AlertTriangle className="mr-4 h-8 w-8" />
                  MANUAL EMERGENCY
              </Button>
              <p className="mt-4 text-muted-foreground">Press in case of an emergency not detected automatically.</p>
          </div>
        </main>

        <footer className="p-4 text-center text-sm text-muted-foreground border-t mt-8">
          <p>&copy; {new Date().getFullYear()} SafeGuard. All Rights Reserved.</p>
        </footer>
      </div>
    </>
  );
}

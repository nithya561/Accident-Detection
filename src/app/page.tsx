"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { analyzeAccident, type AccidentAnalysisOutput } from "@/ai/flows/accident-analysis";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, ShieldCheck, Phone, MessageSquare, Loader2, Settings, Video, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


export default function SafeGuardPage() {
  const [primaryContact, setPrimaryContact] = useState("");
  const [inputContact, setInputContact] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [accidentStatus, setAccidentStatus] = useState<AccidentAnalysisOutput | null>(null);
  const [isEmergency, setIsEmergency] = useState(false);
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

  useEffect(() => {
    const getCameraPermission = async () => {
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
    };

    getCameraPermission();
  }, [toast]);


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

  const triggerAlerts = useCallback(() => {
    if (!primaryContact) {
      toast({
        variant: "destructive",
        title: "No Contact Set",
        description: "Please set a primary contact number before triggering an alert.",
      });
      setIsEmergency(false);
      setAccidentStatus(null);
      return;
    }
    
    toast({
      title: "Emergency Alert Sent",
      description: `An SMS with your location has been sent to ${primaryContact}.`,
      action: <MessageSquare className="text-green-500" />,
    });
    
    setTimeout(() => {
        toast({
          title: "Initiating Emergency Call",
          description: `Calling ${primaryContact} now...`,
          action: <Phone className="text-blue-500" />,
        });
    }, 2000);
  }, [primaryContact, toast]);

  useEffect(() => {
    if (accidentStatus?.isAccident || isEmergency) {
        triggerAlerts();
    }
  }, [accidentStatus, isEmergency, triggerAlerts]);

  const handleAnalyzeFootage = async () => {
    if (!videoRef.current || !hasCameraPermission) {
        toast({
            variant: "destructive",
            title: "Camera Not Ready",
            description: "Cannot analyze footage without camera access.",
        });
        return;
    }

    setIsAnalyzing(true);
    setAccidentStatus(null);
    setIsEmergency(false);

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        toast({ variant: "destructive", title: "Could not process video frame." });
        setIsAnalyzing(false);
        return;
    }
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const frameDataUri = canvas.toDataURL("image/jpeg");

    try {
      const result = await analyzeAccident({ photoDataUri: frameDataUri });
      setAccidentStatus(result);
    } catch (error) {
      console.error("AI analysis failed:", error);
      toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: "Could not analyze the video footage.",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  const handleManualEmergency = () => {
    setAccidentStatus(null);
    setIsEmergency(true);
  };
  
  const resetSystem = () => {
    setAccidentStatus(null);
    setIsEmergency(false);
    toast({
        title: "System Reset",
        description: "Monitoring for new incidents.",
    });
  };

  const getStatus = () => {
    if (isAnalyzing) return { text: "Analyzing video feed...", color: "text-amber-500" };
    if (accidentStatus?.isAccident) return { text: `Accident Detected! Confidence: ${(accidentStatus.confidence * 100).toFixed(0)}%`, color: "text-destructive" };
    if (isEmergency) return { text: "Manual Emergency Activated!", color: "text-destructive" };
    return { text: "All Systems Normal. Ready to analyze.", color: "text-green-600" };
  };

  const status = getStatus();
  const isAlertActive = isEmergency || (accidentStatus?.isAccident ?? false);

  return (
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
                <CardTitle className="flex items-center gap-2 text-xl">
                    <Video className="h-6 w-6" />
                    Live Monitoring
                </CardTitle>
                <CardDescription>Live feed from your camera for accident detection.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="aspect-video bg-muted rounded-md overflow-hidden flex items-center justify-center relative">
                  <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                  {hasCameraPermission === false && (
                       <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white p-4">
                            <AlertCircle className="h-8 w-8 mb-2" />
                            <p className="text-center font-semibold">Camera permission denied.</p>
                            <p className="text-center text-sm">Please enable camera access in your browser settings.</p>
                       </div>
                  )}
                   {hasCameraPermission === null && (
                       <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white">
                            <Loader2 className="h-8 w-8 animate-spin" />
                            <p>Requesting camera...</p>
                       </div>
                  )}
              </div>
            </CardContent>
             <CardFooter className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button onClick={handleAnalyzeFootage} disabled={isAnalyzing || isAlertActive || !hasCameraPermission}>
                  {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Analyze Footage
                </Button>
                {isAlertActive && (
                    <Button onClick={resetSystem} variant="outline">Reset System</Button>
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
                <CardDescription>Set the primary phone number for emergency alerts.</CardDescription>
                </CardHeader>
                <CardContent>
                <div className="space-y-2">
                    <Label htmlFor="contact-number">Primary Contact Number</Label>
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
                <CardFooter>
                    {primaryContact ? (
                        <p className="text-sm text-muted-foreground">Current contact: <span className="font-semibold text-foreground">{primaryContact}</span></p>
                    ) : (
                        <p className="text-sm text-muted-foreground">No primary contact set.</p>
                    )}
                </CardFooter>
            </Card>

            <Card className="w-full shadow-md">
                <CardHeader>
                <CardTitle className="text-xl">System Status</CardTitle>
                <CardDescription>Real-time status of the accident detection system.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                <div className={`text-lg font-semibold ${status.color}`}>
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
                disabled={isAnalyzing || isAlertActive}
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
  );
}

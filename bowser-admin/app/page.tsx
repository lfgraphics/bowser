"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { allowedRoutes } from "./(auth)/login/page";
import { User } from "@/types";
import Loading from "./loading";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    setIsIOS(
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    );

    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // Listen for the beforeinstallprompt event
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Cleanup event listener on component unmount
    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  const handleInstallClick = () => {
    if (deferredPrompt) {
      // Show the install prompt
      deferredPrompt.prompt();

      // Wait for the user to respond to the prompt
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === "accepted") {
          console.log("User accepted the install prompt");
        } else {
          console.log("User dismissed the install prompt");
        }
        // Clear the deferredPrompt so it can only be triggered once
        setDeferredPrompt(null);
      });
    } else {
      console.log("Install prompt not available");
    }
  };

  if (isStandalone) {
    return null;
  }

  return (
    <div>
      <h3>Install App</h3>
      <Button variant="secondary" onClick={handleInstallClick}>
        Add to Home Screen
      </Button>
      {isIOS && (
        <p>
          To install this app on your iOS device, tap the share button
          <span role="img" aria-label="share icon">
            {" "}
            ⎋{" "}
          </span>
          and then "Add to Home Screen"
          <span role="img" aria-label="plus icon">
            {" "}
            ➕{" "}
          </span>
          .
        </p>
      )}
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("adminUser");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        const redirectUrl =
          user.roles.map((role) => allowedRoutes[role]).find((url) => url) ||
          "/profile";

        if (isAuthenticated()) {
          router.push(redirectUrl[0]);
        } else {
          router.push("/login");
        }
      } else {
        router.push("/login");
      }
    }
  }, [isLoading, user, router]);

  return (
    <>
      {isLoading && <Loading />}
      <div className="m-4">Checking your Login status please wait...</div>
    </>
  );
}

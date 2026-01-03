"use client";

import { useEffect, useRef, useCallback } from "react";

export function useWakeLock() {
    const wakeLockRef = useRef<WakeLockSentinel | null>(null);

    const requestWakeLock = useCallback(async () => {
        if ("wakeLock" in navigator) {
            try {
                wakeLockRef.current = await navigator.wakeLock.request("screen");
                console.log("Screen Wake Lock is active");

                wakeLockRef.current.addEventListener("release", () => {
                    console.log("Screen Wake Lock was released");
                });
            } catch (err: any) {
                console.error(`${err.name}, ${err.message}`);
            }
        } else {
            console.warn("Wake Lock API not supported in this browser");
        }
    }, []);

    const releaseWakeLock = useCallback(async () => {
        if (wakeLockRef.current) {
            await wakeLockRef.current.release();
            wakeLockRef.current = null;
        }
    }, []);

    useEffect(() => {
        requestWakeLock();

        const handleVisibilityChange = async () => {
            if (wakeLockRef.current !== null && document.visibilityState === "visible") {
                await requestWakeLock();
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            releaseWakeLock();
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [requestWakeLock, releaseWakeLock]);

    return { requestWakeLock, releaseWakeLock };
}

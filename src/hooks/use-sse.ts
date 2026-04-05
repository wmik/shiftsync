"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface SSEMessage {
  event: string;
  data: Record<string, unknown>;
}

interface UseSSEOptions {
  onMessage?: (message: SSEMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  enabled?: boolean;
}

export function useSSE(url: string, options: UseSSEOptions = {}) {
  const { onMessage, onConnect, onDisconnect, onError, enabled = true } = options;
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const optionsRef = useRef(options);
  const urlRef = useRef(url);

  useEffect(() => {
    optionsRef.current = options;
    urlRef.current = url;
  }, [options, url]);

  useEffect(() => {
    if (!enabled) return;

    const connectFn = () => {
      if (!enabled || eventSourceRef.current) return;

      try {
        const eventSource = new EventSource(urlRef.current);
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
          setIsConnected(true);
          optionsRef.current.onConnect?.();
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            optionsRef.current.onMessage?.({ event: "message", data });
          } catch (error) {
            console.error("Failed to parse SSE message:", error);
          }
        };

        eventSource.addEventListener("connected", (event) => {
          try {
            const data = JSON.parse((event as MessageEvent).data);
            optionsRef.current.onMessage?.({ event: "connected", data });
          } catch (error) {
            console.error("Failed to parse connected event:", error);
          }
        });

        eventSource.addEventListener("heartbeat", (event) => {
          try {
            const data = JSON.parse((event as MessageEvent).data);
            optionsRef.current.onMessage?.({ event: "heartbeat", data });
          } catch (error) {
            console.error("Failed to parse heartbeat event:", error);
          }
        });

        eventSource.addEventListener("notification", (event) => {
          try {
            const data = JSON.parse((event as MessageEvent).data);
            optionsRef.current.onMessage?.({ event: "notification", data });
          } catch (error) {
            console.error("Failed to parse notification event:", error);
          }
        });

        eventSource.onerror = (error) => {
          console.error("SSE error:", error);
          optionsRef.current.onError?.(new Error("SSE connection error"));
          setIsConnected(false);
          eventSource.close();
          eventSourceRef.current = null;

          reconnectTimeoutRef.current = setTimeout(() => {
            connectFn();
          }, 5000);
        };
      } catch (error) {
        optionsRef.current.onError?.(error as Error);
      }
    };

    const disconnectFn = () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      setIsConnected(false);
      optionsRef.current.onDisconnect?.();
    };

    connectFn();

    return () => {
      disconnectFn();
    };
  }, [enabled]);

  const reconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  return {
    isConnected,
    reconnect,
  };
}

import React from "react";
import type { AnchorHTMLAttributes } from "react";
import { Capacitor } from "@capacitor/core";
import { isMobileDevice } from "../services/platformService";

type InspirationSearchLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  provider: "pinterest" | "rednote";
};

const REDNOTE_PACKAGE = "com.xingin.xhs";

function getAndroidRednoteIntentUrl(webUrl: string): string {
  const searchUrl = new URL(webUrl);
  const query = searchUrl.searchParams.get("keyword") || "";
  const appPath = `/search/result?keyword=${encodeURIComponent(query)}`;
  return `intent://${appPath.slice(1)}#Intent;scheme=xhsdiscover;package=${REDNOTE_PACKAGE};S.browser_fallback_url=${encodeURIComponent(webUrl)};end`;
}

/**
 * HTTPS links can hand off to provider apps through Universal Links / App Links.
 * Keep mobile navigation in the current context; desktop opens a new tab.
 */
export const InspirationSearchLink: React.FC<InspirationSearchLinkProps> = ({
  children,
  href,
  provider,
  onClick,
  ...props
}) => {
  const mobile = isMobileDevice();
  const android = mobile && /android/i.test(navigator.userAgent || "");
  const nativeAndroid = android && Capacitor.isNativePlatform();
  const webUrl = String(href || "");
  const androidIntentUrl = android && provider === "rednote"
    ? getAndroidRednoteIntentUrl(webUrl)
    : webUrl;

  const handleClick: React.MouseEventHandler<HTMLAnchorElement> = (event) => {
    onClick?.(event);
    if (event.defaultPrevented || !nativeAndroid || provider !== "rednote") return;

    event.preventDefault();
    const searchUrl = new URL(webUrl);
    const query = searchUrl.searchParams.get("keyword") || "";
    let appOpened = false;
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") appOpened = true;
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.setTimeout(() => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (!appOpened && document.visibilityState !== "hidden") {
        window.location.assign(webUrl);
      }
    }, 1400);
    window.location.assign(`xhsdiscover://search/result?keyword=${encodeURIComponent(query)}`);
  };

  return (
    <a
      {...props}
      href={android && provider === "rednote" && !nativeAndroid ? androidIntentUrl : href}
      target={mobile ? undefined : "_blank"}
      rel={mobile ? undefined : "noopener noreferrer"}
      onClick={handleClick}
    >
      {children}
    </a>
  );
};

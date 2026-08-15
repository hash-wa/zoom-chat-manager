import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";

// Next.js already inlines the stylesheet above at build time, so let
// Font Awesome skip injecting its own <style> tag at runtime (which would
// otherwise cause a flash of oversized, unstyled icons on first paint).
config.autoAddCss = false;

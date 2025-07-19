// Global polyfills for Node.js environment - must be loaded first
if (typeof window === "undefined" && typeof global !== "undefined") {
  // Promise.withResolvers polyfill
  if (typeof Promise.withResolvers === "undefined") {
    Promise.withResolvers = function () {
      let resolve, reject;
      const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    };
  }

  // DOMMatrix polyfill
  if (typeof global.DOMMatrix === "undefined") {
    global.DOMMatrix = class DOMMatrix {
      constructor(init) {
        if (Array.isArray(init)) {
          this.a = init[0] || 1;
          this.b = init[1] || 0;
          this.c = init[2] || 0;
          this.d = init[3] || 1;
          this.e = init[4] || 0;
          this.f = init[5] || 0;
        } else {
          this.a = 1;
          this.b = 0;
          this.c = 0;
          this.d = 1;
          this.e = 0;
          this.f = 0;
        }
      }

      static fromMatrix(matrix) {
        return new DOMMatrix([
          matrix.a,
          matrix.b,
          matrix.c,
          matrix.d,
          matrix.e,
          matrix.f,
        ]);
      }

      multiply(other) {
        return new DOMMatrix([
          this.a * other.a + this.c * other.b,
          this.b * other.a + this.d * other.b,
          this.a * other.c + this.c * other.d,
          this.b * other.c + this.d * other.d,
          this.a * other.e + this.c * other.f + this.e,
          this.b * other.e + this.d * other.f + this.f,
        ]);
      }

      translate(tx, ty) {
        return new DOMMatrix([
          this.a,
          this.b,
          this.c,
          this.d,
          this.a * tx + this.c * ty + this.e,
          this.b * tx + this.d * ty + this.f,
        ]);
      }

      scale(sx, sy = sx) {
        return new DOMMatrix([
          this.a * sx,
          this.b * sx,
          this.c * sy,
          this.d * sy,
          this.e,
          this.f,
        ]);
      }
    };
  }

  // ImageData polyfill
  if (typeof global.ImageData === "undefined") {
    global.ImageData = class ImageData {
      constructor(dataOrWidth, widthOrHeight, height) {
        if (typeof dataOrWidth === "object") {
          this.data = dataOrWidth;
          this.width = widthOrHeight;
          this.height = height;
        } else {
          this.width = dataOrWidth;
          this.height = widthOrHeight;
          this.data = new Uint8ClampedArray(this.width * this.height * 4);
        }
      }
    };
  }

  // Path2D polyfill
  if (typeof global.Path2D === "undefined") {
    global.Path2D = class Path2D {
      constructor(path) {
        this.path = path || "";
      }

      addPath(path) {
        this.path += path.path || "";
      }

      closePath() {
        this.path += "Z";
      }

      moveTo(x, y) {
        this.path += `M${x},${y}`;
      }

      lineTo(x, y) {
        this.path += `L${x},${y}`;
      }

      bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y) {
        this.path += `C${cp1x},${cp1y} ${cp2x},${cp2y} ${x},${y}`;
      }

      quadraticCurveTo(cpx, cpy, x, y) {
        this.path += `Q${cpx},${cpy} ${x},${y}`;
      }

      arc(x, y, radius, startAngle, endAngle, anticlockwise) {
        // Simplified arc implementation
        this.path += `A${radius},${radius} 0 0,${
          anticlockwise ? 1 : 0
        } ${x},${y}`;
      }

      rect(x, y, width, height) {
        this.path += `M${x},${y}L${x + width},${y}L${x + width},${
          y + height
        }L${x},${y + height}Z`;
      }
    };
  }

  // Document polyfill
  if (typeof global.document === "undefined") {
    global.document = {
      createElement: (tagName) => ({
        tagName: tagName.toUpperCase(),
        style: {},
        setAttribute: () => {},
        getAttribute: () => null,
        appendChild: () => {},
        removeChild: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
      }),
      createElementNS: (namespace, tagName) => ({
        tagName: tagName.toUpperCase(),
        namespace,
        style: {},
        setAttribute: () => {},
        getAttribute: () => null,
        appendChild: () => {},
        removeChild: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
      }),
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => [],
    };
  }

  // Window polyfill
  if (typeof global.window === "undefined") {
    global.window = global;
  }

  // Navigator polyfill
  if (typeof global.navigator === "undefined") {
    global.navigator = {
      userAgent: "Node.js",
      platform: "Node.js",
    };
  }

  // Location polyfill
  if (typeof global.location === "undefined") {
    global.location = {
      href: "http://localhost",
      origin: "http://localhost",
      protocol: "http:",
      host: "localhost",
      hostname: "localhost",
      port: "",
      pathname: "/",
      search: "",
      hash: "",
    };
  }

  // Ensure Promise.withResolvers is available globally
  if (typeof global.Promise === "undefined") {
    global.Promise = Promise;
  }
  if (typeof global.Promise.withResolvers === "undefined") {
    global.Promise.withResolvers = Promise.withResolvers;
  }

  // Console polyfill (just in case)
  if (typeof global.console === "undefined") {
    global.console = console;
  }
}

// Export for explicit imports if needed
export const initializePolyfills = () => {
  // Polyfills are already initialized above
  return true;
};

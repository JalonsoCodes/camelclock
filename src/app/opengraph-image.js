import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "CamelClocks — pixel-art countdown clocks";

export default function Image() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#DBB279",
                    padding: 48,
                }}
            >
                <div
                    style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 32,
                        border: "12px solid #111111",
                        boxShadow: "0 0 0 8px #ffffff",
                        padding: 64,
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            fontSize: 40,
                            color: "#8E652C",
                            letterSpacing: 8,
                            textTransform: "uppercase",
                        }}
                    >
                        🐪 Countdown clocks with humps of character
                    </div>
                    <div
                        style={{
                            display: "flex",
                            fontSize: 96,
                            fontWeight: 700,
                            color: "#111111",
                            letterSpacing: 4,
                        }}
                    >
                        CAMELCLOCKS
                    </div>
                    <div
                        style={{
                            display: "flex",
                            fontSize: 36,
                            color: "#8E652C",
                        }}
                    >
                        camelclocks.com
                    </div>
                </div>
            </div>
        ),
        size
    );
}

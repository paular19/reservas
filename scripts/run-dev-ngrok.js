// scripts/dev-with-ngrok.js
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const ngrok = require("ngrok");

const ENV_PATH = path.resolve(".env.local");
const PORT = process.env.PORT || 3000;

(async function () {
  try {
    const url = await ngrok.connect(PORT);
    console.log(`🚀 Ngrok tunnel established at: ${url}`);

    let env = "";
    if (fs.existsSync(ENV_PATH)) {
      env = fs.readFileSync(ENV_PATH, "utf-8");
    }

    const lines = env.split("\n").filter(Boolean);
    const updatedLines = (() => {
      const found = lines.some((line) =>
        line.startsWith("NEXT_PUBLIC_RETURN_URL=")
      );
      if (found) {
        return lines.map((line) =>
          line.startsWith("NEXT_PUBLIC_RETURN_URL=")
            ? `NEXT_PUBLIC_RETURN_URL=${url}`
            : line
        );
      } else {
        return [...lines, `NEXT_PUBLIC_RETURN_URL=${url}`];
      }
    })();

    fs.writeFileSync(ENV_PATH, updatedLines.join("\n") + "\n");
    console.log("✅ .env.local actualizado con NEXT_PUBLIC_RETURN_URL");

    // Ejecutar el server de desarrollo
    const dev = exec("npm run dev:only", { stdio: "inherit" });
    dev.stdout?.pipe(process.stdout);
    dev.stderr?.pipe(process.stderr);
  } catch (err) {
    console.error("❌ Error al iniciar ngrok", err);
    process.exit(1);
  }
})();

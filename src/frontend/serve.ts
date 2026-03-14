import appJs from "./app.js";
import htmlContent from "./index.html";

export const html = htmlContent.replace("</body>", `<script>${appJs}</script>\n</body>`);

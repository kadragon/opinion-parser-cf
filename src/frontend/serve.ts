import appJs from "./app.js.txt";
import htmlContent from "./index.html";

export const html = htmlContent.replace("</body>", `<script>${appJs}</script>\n</body>`);

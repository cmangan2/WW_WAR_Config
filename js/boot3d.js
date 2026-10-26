// Starts the 3D page. Loaded as a module after the classic configurator scripts.
import { RifleView } from "./model3d.js";

const view = new RifleView(document.getElementById("rifle3d"));
document.querySelector(".ww-config .views").addEventListener("click", e => {
  const v = e.target.dataset.view;
  if (v) view.setView(v);
});
startConfigurator(b => view.update(b));

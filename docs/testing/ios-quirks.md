# iOS Safari quirks

Running list of iOS Safari behaviours that needed a workaround. Each entry
names the source; none of them is verified on a device in this project.

| Quirk | Workaround | Source |
|---|---|---|
| Double tap zooms the page, even inside the editor. `user-scalable=no` is ignored by Safari since iOS 10. | `touch-action: manipulation` on `html, body` in `styles.css`. The Viewer and sliders keep their own `none` / `pan-y`, which also exclude zoom. | WebKit, "touch-action" support since Safari 13; MDN touch-action |

import { nativeTheme } from "electron";
import Settings from "./settings";
import Window from "./windows/window";
import HandsOffCoding from "./hands-off-coding";

type Receiver = Window | Promise<Window> | undefined;

export default class Bridge {
  private handsOffCoding: HandsOffCoding | undefined;
  
  constructor(private settings: Settings) {}

  link(handsOffCoding: HandsOffCoding) {
    this.handsOffCoding = handsOffCoding;
  }

  async send(message: string, data: any, windows: Receiver[]) {
    // suppress errors that might occur while closing the app
    try {
      for (const e of windows) {
        if (e) {
          (await Promise.resolve(e)).send(message, data);
          if (this.handsOffCoding) {
            this.handsOffCoding.send(message, data);
          }
        }
      }
    } catch (e) {}
  }

  setState(data: any, windows: Receiver[]) {
    this.send("setState", data, windows);
  }

  updateDarkMode(windows: Receiver[]) {
    const darkMode = this.settings.getDarkMode();
    this.setState(
      {
        darkMode,
        darkTheme: darkMode == "dark" || (darkMode == "system" && nativeTheme.shouldUseDarkColors),
      },
      windows
    );
  }
}

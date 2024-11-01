export class Keyboard {
    public static readonly state: Map<string, boolean> = new Map();
    public static onPushListeners: Map<string, Array<() => void>> = new Map();

    public static initialize() {
        document.addEventListener("keydown", Keyboard.keyDown);
        document.addEventListener("keyup", Keyboard.keyUp);
        this.onPushListeners = new Map();
    }

    private static keyDown(e: KeyboardEvent): void {
        if (!Keyboard.state.get(e.code))
            Keyboard.onPush(e);
        Keyboard.state.set(e.code, true)
    }

    private static keyUp(e: KeyboardEvent): void {
        Keyboard.state.set(e.code, false)
    }

    public static onPushSubscribe(keyCode: string, bindFunc: () => void): void {
        if (keyCode in Keyboard.onPushListeners) {
            Keyboard.onPushListeners.get(keyCode)!.push(bindFunc);
        } else {
            Keyboard.onPushListeners.set(keyCode, [bindFunc]);
        }
    }

    public static onPushUnsubscribe(keyCode: string, bindFunc: () => void): void {
        const listeners = Keyboard.onPushListeners.get(keyCode);
        if (listeners) {
            const index = listeners.indexOf(bindFunc);
            if (index > -1) {
                listeners.splice(index, 1);
                if (listeners.length === 0) {
                    Keyboard.onPushListeners.delete(keyCode);
                }
            }
        }
    }

    private static onPush(e: KeyboardEvent): void {
        const listeners = Keyboard.onPushListeners.get(e.code);
        if (listeners !== undefined) {
            listeners.forEach(listener => {
                listener()
            })
        }
    }
}
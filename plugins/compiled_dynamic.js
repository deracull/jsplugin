/*
 * Transpiled: deracul fake voice shit (FakeDeafen)
 * For use in dynamic script loaders like the GitHub Plugin Manager
 */

const { React, Toasts, Menu, ContextMenuApi } = VencordAPI;
const { findByProps } = VencordAPI.Webpack;

// Resolve UserAreaButton dynamically
const UserAreaButton = VencordAPI.Webpack.findComponentByCodeLazy("tooltipPositionKey", "positionKeyStemOverride");

/* ===========================
 * Module Lookups
 * =========================== */
let VoiceStateStore, ChannelStore, MediaEngineStore, GatewayConnectionStore, SelectedGuildStore;

const safeFind = (...props) => {
    try {
        return findByProps(...props);
    } catch (e) {
        return null;
    }
};

function loadStores() {
    if (!VoiceStateStore) VoiceStateStore = safeFind("getVoiceChannelId");
    if (!ChannelStore) {
        ChannelStore = safeFind("getChannel", "getDMFromUserId");
        if (!ChannelStore) ChannelStore = safeFind("getChannel", "hasChannel");
    }
    if (!MediaEngineStore) MediaEngineStore = safeFind("isSelfMute");
    if (!GatewayConnectionStore) GatewayConnectionStore = safeFind("getSocket");
    if (!SelectedGuildStore) SelectedGuildStore = safeFind("getLastSelectedGuildId");
}

/* ===========================
 * State
 * =========================== */
const states = {
    mute: true,
    deafen: true,
    video: false
};

let globalForceUpdate = null;

/* ===========================
 * Gateway Push
 * =========================== */
function triggerUpdate() {
    loadStores();
    if (!VoiceStateStore || !ChannelStore || !GatewayConnectionStore) return;

    const channelId = VoiceStateStore.getVoiceChannelId();
    if (!channelId) return;

    const channel = ChannelStore.getChannel(channelId);
    if (!channel) return;

    let guildId = channel.guild_id;
    if (!guildId && (channel.type === 2 || channel.type === 13)) {
        if (SelectedGuildStore) guildId = SelectedGuildStore.getLastSelectedGuildId();
        if (!guildId) return;
    }

    const socket = GatewayConnectionStore.getSocket();
    if (!socket || typeof socket.send !== "function") return;

    const realMute = MediaEngineStore ? MediaEngineStore.isSelfMute() : false;
    const realDeaf = MediaEngineStore ? MediaEngineStore.isSelfDeaf() : false;
    const realVideo = MediaEngineStore ? MediaEngineStore.isVideoEnabled() : false;

    try {
        socket.send(4, {
            guild_id: guildId,
            channel_id: channelId,
            self_mute: !states.mute ? true : realMute,
            self_deaf: !states.deafen ? true : realDeaf,
            self_video: states.video || realVideo
        });
    } catch (e) {
        console.error("[FakeVoice] Send Failed:", e);
    }
}

/* ===========================
 * Toast helper
 * =========================== */
function showFakeToast(type, enabled) {
    Toasts.show({
        message: `Fake ${type} ${enabled ? "enabled" : "disabled"}`,
        id: `fake-${type}`,
        type: enabled ? Toasts.Type.SUCCESS : Toasts.Type.FAILURE,
        options: { position: Toasts.Position.BOTTOM }
    });
}

/* ===========================
 * Keybinds
 * =========================== */
function keybindDeafen(e) {
    if (e.ctrlKey && e.key.toLowerCase() === "l") {
        states.deafen = !states.deafen;
        showFakeToast("deafen", !states.deafen);
        triggerUpdate();
        globalForceUpdate?.();
    }
}

function keybindMute(e) {
    if (e.ctrlKey && e.key.toLowerCase() === "j") {
        states.mute = !states.mute;
        showFakeToast("mute", !states.mute);
        triggerUpdate();
        globalForceUpdate?.();
    }
}

/* ===========================
 * Icon
 * =========================== */
function makeIcon(active) {
    return ({ className }) => React.createElement("svg", {
        className,
        xmlns: "http://www.w3.org/2000/svg",
        width: "19",
        height: "19",
        viewBox: "0 0 512 512"
    }, 
        React.createElement("path", {
            fill: "currentColor",
            d: "M256 48C141.1 48 48 141.1 48 256v40c0 13.3-10.7 24-24 24s-24-10.7-24-24V256C0 114.6 114.6 0 256 0S512 114.6 512 256V400.1c0 48.6-39.4 88-88.1 88L313.6 488c-8.3 14.3-23.8 24-41.6 24H240c-26.5 0-48-21.5-48-48s21.5-48 48-48h32c17.8 0 33.3 9.7 41.6 24l110.4.1c22.1 0 40-17.9 40-40V256c0-114.9-93.1-208-208-208zM144 208h16c17.7 0 32 14.3 32 32V352c0 17.7-14.3 32-32 32H144c-35.3 0-64-28.7-64-64V272c0-35.3 28.7-64 64-64zm224 0c35.3 0 64 28.7 64 64v48c0 35.3-28.7 64-64 64H352c-17.7 0-32-14.3-32-32V240c0-17.7 14.3-32 32-32h16z"
        }),
        !active && React.createElement("line", {
            x1: "495",
            y1: "10",
            x2: "10",
            y2: "464",
            stroke: "var(--status-danger)",
            strokeWidth: "40"
        })
    );
}

function FakeVoiceContextMenu() {
    const [_, forceUpdate] = React.useReducer(x => x + 1, 0);

    return React.createElement(Menu.Menu, { navId: "fake-voice-menu", onClose: () => {} },
        React.createElement(Menu.MenuCheckboxItem, {
            id: "vc-fake-mute",
            label: "Fake Mute",
            checked: !states.mute,
            action: () => {
                states.mute = !states.mute;
                showFakeToast("mute", !states.mute);
                triggerUpdate();
                globalForceUpdate?.();
                forceUpdate();
            }
        }),
        React.createElement(Menu.MenuCheckboxItem, {
            id: "vc-fake-deafen",
            label: "Fake Deafen",
            checked: !states.deafen,
            action: () => {
                states.deafen = !states.deafen;
                showFakeToast("deafen", !states.deafen);
                triggerUpdate();
                globalForceUpdate?.();
                forceUpdate();
            }
        }),
        React.createElement(Menu.MenuCheckboxItem, {
            id: "vc-fake-video",
            label: "Fake Camera",
            checked: states.video,
            action: () => {
                states.video = !states.video;
                showFakeToast("video", states.video);
                triggerUpdate();
                globalForceUpdate?.();
                forceUpdate();
            }
        })
    );
}

function FakeVoiceButton(props) {
    const { iconForeground, hideTooltips, nameplate } = props;
    const [_, forceUpdate] = React.useReducer(x => x + 1, 0);
    const ref = React.useRef(null);

    React.useEffect(() => {
        globalForceUpdate = forceUpdate;
        forceUpdate();
        return () => { globalForceUpdate = null; };
    }, []);

    React.useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const handler = (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            ContextMenuApi.openContextMenu(e, () => React.createElement(FakeVoiceContextMenu));
        };
        el.addEventListener("contextmenu", handler, true);
        return () => el.removeEventListener("contextmenu", handler, true);
    }, []);

    const anyActive = !states.mute || !states.deafen || states.video;
    const Icon = makeIcon(anyActive);

    return React.createElement("div", { ref: ref, style: { display: "contents" } },
        React.createElement(UserAreaButton, {
            tooltipText: hideTooltips ? undefined : "Fake Voice (right-click for options)",
            icon: React.createElement(Icon, { className: iconForeground }),
            role: "switch",
            "aria-checked": anyActive,
            redGlow: false,
            plated: nameplate != null,
            onClick: () => {
                if (anyActive) {
                    states.mute = true;
                    states.deafen = true;
                    states.video = false;
                    showFakeToast("mute", false);
                    showFakeToast("deafen", false);
                    showFakeToast("video", false);
                } else {
                    states.mute = false;
                    showFakeToast("mute", true);
                }
                triggerUpdate();
                forceUpdate();
            }
        })
    );
}

/* ===========================
 * Plugin exports
 * =========================== */
module.exports = {
    name: "deracul fake voice shit",
    description: "Fake mute, deafen, and camera with real-time gateway push",
    authors: [{ name: "deracul", id: 1452677997877526609n }],
    dependencies: ["UserAreaAPI"],

    state(type, real) {
        if (type === "mute" && !states.mute) return true;
        if (type === "deafen" && !states.deafen) return true;
        return real;
    },

    modifyVoiceState(e) {
        e.selfVideo = states.video || e.selfVideo;
        return e;
    },

    patches: [
        {
            find: "}voiceStateUpdate(",
            replacement: {
                match: /self_mute:([^,]+),self_deaf:([^,]+)/,
                replace: "self_mute:$self.state('mute',$1),self_deaf:$self.state('deafen',$2)"
            }
        },
        {
            find: "voiceServerPing(){",
            replacement: {
                match: /voiceStateUpdate\((\w+)\)\{(.{0,10})guildId:/,
                replace: "voiceStateUpdate($1){$1=$self.modifyVoiceState($1);$2guildId:"
            }
        }
    ],

    userAreaButton: {
        icon: makeIcon(true),
        render: FakeVoiceButton,
    },

    start() {
        loadStores();
        document.addEventListener("keydown", keybindDeafen);
        document.addEventListener("keydown", keybindMute);
    },

    stop() {
        document.removeEventListener("keydown", keybindDeafen);
        document.removeEventListener("keydown", keybindMute);
        globalForceUpdate = null;
    }
};

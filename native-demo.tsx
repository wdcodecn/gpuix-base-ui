import { createElement, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import type { MotionProps } from '@gpuix/react'
import { Badge, Button, Card, Dialog, Input, Separator, Switch, useTheme } from './src'

type Unsubscribe = () => void

type DeviceInfo = {
  model: string
  manufacturer: string
  brand: string
  device: string
  sdkInt: number
  release: string
  abis: string[]
  packageName: string
  versionName: string
  versionCode: number
  locale: string
  isPhysicalDevice: boolean
  screenWidthPx: number
  screenHeightPx: number
  density: number
  networkType: string
  isMetered: boolean
}

type BatteryInfo = {
  level: number
  charging: boolean
  temperatureC: number
  voltageMv: number
}

type SensorReading = {
  type: string
  values: number[]
  accuracy?: number
  timestamp: number
}

type MediaPickResult = {
  cancelled: boolean
  uri?: string
  path?: string
  name?: string
  mimeType?: string
  width?: number
  height?: number
  size?: number
}

type LocationResult = {
  latitude: number
  longitude: number
  accuracy: number
  altitude: number
  provider: string
  timestamp: number
}

type OtaState = {
  source: 'embedded' | 'ota'
  appId: string
  versionName: string
  versionCode: number
  runtimeVersion: string
  channel: string
  manifestUrl: string | null
  hasPublicKey: boolean
  checkOnLaunch: 'manual' | 'background' | 'immediate'
  embeddedFormat: 'hbc' | 'js'
  embeddedBuildId: string
  hbcVersion?: number
  currentReleaseId: string | null
  currentFormat: 'hbc' | 'js'
  stagedReleaseId: string | null
  previousReleaseId: string | null
  confirmed: boolean
  launchAttempts: number
  bootCrashStreak?: number
  rescueMode?: boolean
  minManifestSeq?: number
  nativeLaunchCheckStarted?: boolean
  failedReleaseIds: string[]
  lastRollbackReason: string | null
  lastCheckedAt: number
}

type OtaManifest = {
  schemaVersion: number
  action?: 'update' | 'rollback_to_embedded'
  appId: string
  channel?: string
  runtimeVersion: string
  releaseId: string
  minVersionCode?: number
  manifestSeq?: number
  mandatory?: boolean
  notes?: string
  publishedAt?: string
  manifestSignature?: string
  bundle?: {
    format: 'hbc' | 'js'
    url: string
    sha256: string
    size: number
    hermesBytecodeVersion?: number
    signature?: string
  }
}

type OtaProgressEvent = {
  releaseId: string
  bytesReceived: number
  totalBytes: number
  progress: number
  phase: 'downloading' | 'verifying' | 'ready'
}

export type GpuixNativeSdk = {
  onEvent: (channel: string, fn: (payload: unknown) => void) => Unsubscribe
  onBackPressed: (handler: () => boolean | void) => Unsubscribe
  onDeepLink: (handler: (url: string) => void) => Unsubscribe
  onAppStateChange?: (fn: (ev: { state: 'active' | 'background' }) => void) => Unsubscribe
  onNetworkChange?: (fn: (ev: { connected: boolean; networkType: string; isMetered: boolean }) => void) => Unsubscribe
  notifications: {
    areEnabled: () => Promise<{ enabled: boolean; permissionGranted: boolean }>
    show: (opts: { id?: number; title: string; body: string; deepLink?: string; ongoing?: boolean; sound?: boolean }) => Promise<{ id: number; shown: boolean }>
    schedule: (opts: { id?: number; delayMs?: number; title: string; body: string; deepLink?: string }) => Promise<{ id: number; delayMs: number }>
    showProgress: (opts: { id?: number; title: string; body: string; progress: number; max?: number; indeterminate?: boolean }) => Promise<{ id: number; progress: number }>
    cancel: (id: number) => Promise<{ cancelled: boolean }>
    cancelAll: () => Promise<{ cancelledAll: boolean }>
  }
  audio: {
    playTone: (type?: string) => Promise<{ played: string }>
    getVolume: (stream?: string) => Promise<{ volume: number; current: number; max: number }>
    setVolume: (volume: number, stream?: string) => Promise<{ volume: number; current: number; max: number }>
    speak: (text: string, opts?: { rate?: number; pitch?: number }) => Promise<{ speaking: boolean; text: string }>
    stopSpeak: () => Promise<{ stopped: boolean }>
  }
  haptics: {
    impact: (style?: string) => Promise<{ style: string }>
    vibrate: (opts?: { durationMs?: number; pattern?: number[] }) => Promise<{ vibrated: boolean }>
  }
  biometrics: {
    canAuthenticate: () => Promise<{ available: boolean; status: string }>
    authenticate: (opts?: { title?: string; subtitle?: string; description?: string; cancelText?: string }) => Promise<{ authenticated: boolean; reason?: string; errorCode?: number }>
  }
  torch: {
    isAvailable: () => Promise<{ available: boolean; enabled: boolean }>
    setEnabled: (enabled: boolean) => Promise<{ enabled: boolean }>
  }
  sensors: {
    sample: (type: string) => Promise<SensorReading>
    start: (type: string, intervalMs?: number) => Promise<{ started: string }>
    stop: (type: string) => Promise<{ stopped: string }>
    onData: (fn: (reading: SensorReading) => void) => Unsubscribe
  }
  device: {
    getInfo: () => Promise<DeviceInfo>
    getBattery: () => Promise<BatteryInfo>
  }
  system: {
    toast: (message: string, isLong?: boolean) => Promise<{ shown: boolean }>
    alert: (opts: { title?: string; message: string; confirmText?: string; cancelText?: string }) => Promise<{ confirmed: boolean }>
    setKeepScreenOn: (enabled: boolean) => Promise<{ keepScreenOn: boolean }>
    setBrightness: (value: number) => Promise<{ brightness: number }>
    openAppSettings: () => Promise<{ opened: boolean }>
    moveToBack: () => Promise<{ ok: boolean }>
  }
  clipboard: {
    read: () => Promise<{ text: string | null }>
    write: (text: string) => Promise<{ written: boolean }>
  }
  launcher: {
    openUrl: (url: string) => Promise<{ opened: boolean }>
    canOpenUrl: (url: string) => Promise<{ canOpen: boolean }>
    getInitialUrl: () => Promise<{ url: string | null }>
    share: (opts: { title?: string; text: string; url?: string }) => Promise<{ shared: boolean }>
    isAppInstalled?: (packageName: string) => Promise<{ installed: boolean }>
    openMarket?: (packageName?: string) => Promise<{ opened: boolean }>
  }
  permissions: {
    check: (permission: string) => Promise<{ granted: boolean }>
    request: (permissions: string[]) => Promise<{ granted: boolean; results: Record<string, string> }>
  }
  storage: {
    get: (key: string) => Promise<{ value: string | null }>
    set: (key: string, value: string) => Promise<{ ok: boolean }>
    remove: (key: string) => Promise<{ ok: boolean }>
    clear: () => Promise<{ ok: boolean }>
    keys: () => Promise<{ keys: string[] }>
  }
  secureStorage: {
    write: (service: string, account: string, value: string) => Promise<{ ok: boolean }>
    read: (service: string, account: string) => Promise<{ value: string | null }>
    delete: (service: string, account: string) => Promise<{ ok: boolean }>
  }
  fs?: {
    readText: (path: string, scope?: 'files' | 'cache') => Promise<{ content: string; size: number }>
    writeText: (path: string, content: string, opts?: { scope?: 'files' | 'cache'; append?: boolean }) => Promise<{ written: number; path: string }>
    getStorageInfo: () => Promise<{ filesAvailableBytes: number; filesTotalBytes: number; cacheAvailableBytes: number; fsFilesUsedBytes: number; fsCacheUsedBytes: number }>
  }
  media: {
    pickImage: () => Promise<MediaPickResult>
    pickFile: (mimeType?: string) => Promise<MediaPickResult>
    takePhoto: () => Promise<MediaPickResult>
  }
  location: {
    getCurrentPosition: () => Promise<LocationResult>
  }
  ota: {
    getState: () => Promise<OtaState>
    check: (opts?: { manifestUrl?: string; channel?: string; timeoutMs?: number; headers?: Record<string, string> }) => Promise<{ available: boolean; reason: string | null; currentReleaseId: string | null; stagedReleaseId: string | null; embeddedBuildId: string; manifest: OtaManifest }>
    download: (opts?: { manifest?: OtaManifest; manifestUrl?: string; timeoutMs?: number; headers?: Record<string, string> }) => Promise<OtaState & { downloaded: boolean; reused: boolean; releaseId: string; bytes?: number }>
    apply: (opts?: { mode?: 'hot' | 'next_launch' | 'restart' }) => Promise<OtaState & { applied: boolean; mode: string; releaseId: string }>
    confirm: () => Promise<OtaState & { confirmedNow: boolean }>
    rollback: (opts?: { applyNow?: boolean; mode?: 'hot' | 'restart'; reason?: string }) => Promise<OtaState & { rolledBackFrom: string | null }>
    reset: (opts?: { applyNow?: boolean }) => Promise<OtaState & { reset: boolean }>
    setManualConfirm: (enabled: boolean) => void
    onProgress: (fn: (ev: OtaProgressEvent) => void) => Unsubscribe
  }
}

type WsLike = {
  readyState: number
  onopen: ((ev: unknown) => void) | null
  onmessage: ((ev: { data?: unknown }) => void) | null
  onerror: ((ev: { message?: string }) => void) | null
  onclose: ((ev: { code?: number; reason?: string }) => void) | null
  send: (data: string) => void
  close: (code?: number, reason?: string) => void
}

type WsConstructor = new (url: string) => WsLike

type StorageLike = {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
  clear: () => void
  key: (index: number) => string | null
  readonly length: number
}

type FetchResponseLike = {
  status: number
  ok: boolean
  url: string
  text: () => Promise<string>
}

type FetchFn = (input: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<FetchResponseLike>

type LogEntry = { id: number; time: string; tone: 'info' | 'success' | 'warning' | 'danger'; text: string }

function getSdk(): GpuixNativeSdk | null {
  const sdk: unknown = Reflect.get(globalThis, 'gpuix')
  return sdk && typeof sdk === 'object' ? (sdk as GpuixNativeSdk) : null
}

function nowLabel(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

function DemoCard({ title, description, badge, children }: {
  title: string
  description: string
  badge?: string
  children: ReactNode
}) {
  return <Card.Root>
    <Card.Header title={title} description={description} icon="◈" action={badge ? <Badge tone="info">{badge}</Badge> : undefined} />
    <Card.Content gap={10}>{children}</Card.Content>
  </Card.Root>
}

function WrapRow({ children }: { children: ReactNode }) {
  return <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>{children}</div>
}

function SensorReadout({ sdk, active, singleSample }: { sdk: GpuixNativeSdk | null; active: string | null; singleSample: string }) {
  const { tokens: C } = useTheme()
  const [readingText, setReadingText] = useState('')
  useEffect(() => {
    if (!sdk || !active) return
    return sdk.sensors.onData((reading) => {
      if (reading.type !== active) return
      const values = reading.values.map((value) => value.toFixed(2)).join(', ')
      setReadingText(`[${reading.type}] ${values}`)
    })
  }, [sdk, active])
  return <text style={{ fontSize: 11, color: C.muted }}>{`传感器：${active ? readingText || '等待采样' : singleSample}`}</text>
}

export function NativeCapabilitiesDemo() {
  const { tokens: C } = useTheme()
  const sdk = getSdk()

  const logSeq = useRef(1)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const pushLog = useCallback((tone: LogEntry['tone'], text: string) => {
    const id = logSeq.current++
    setLogs((prev) => [{ id, time: nowLabel(), tone, text }, ...prev].slice(0, 12))
  }, [])

  const runTask = useCallback(async <T,>(label: string, fn: (nativeSdk: GpuixNativeSdk) => Promise<T>, onOk?: (res: T) => void) => {
    if (!sdk) {
      pushLog('warning', `${label}: 仅在 Android 宿主可用`)
      return
    }
    try {
      const res = await fn(sdk)
      onOk?.(res)
      pushLog('success', `${label} -> ${JSON.stringify(res)}`)
    } catch (err) {
      pushLog('danger', `${label} 失败: ${errorText(err)}`)
    }
  }, [sdk, pushLog])

  // ── Device & Battery ───────────────────────────────────────────────────────
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null)
  const [battery, setBattery] = useState<BatteryInfo | null>(null)

  const refreshDevice = useCallback(async () => {
    if (!sdk) return
    try {
      const [info, bat] = await Promise.all([sdk.device.getInfo(), sdk.device.getBattery()])
      setDeviceInfo(info)
      setBattery(bat)
    } catch (err) {
      pushLog('warning', `读取设备信息失败: ${errorText(err)}`)
    }
  }, [sdk, pushLog])

  // ── Notifications ──────────────────────────────────────────────────────────
  const [notifStatus, setNotifStatus] = useState<string>('未检测')
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startProgressNotification = useCallback(() => {
    if (!sdk) {
      pushLog('warning', '进度通知仅在 Android 宿主可用')
      return
    }
    if (progressTimerRef.current !== null) {
      clearInterval(progressTimerRef.current)
      progressTimerRef.current = null
    }
    let step = 0
    void sdk.notifications.showProgress({ id: 2026, title: 'GPUIX 原生下载任务', body: '正在初始化 0%', progress: 0, max: 100 })
    pushLog('info', '已启动进度通知 (id=2026)')
    progressTimerRef.current = setInterval(() => {
      step += 20
      if (step < 100) {
        void sdk.notifications.showProgress({ id: 2026, title: 'GPUIX 原生下载任务', body: `下载进度 ${step}%`, progress: step, max: 100 })
      } else {
        if (progressTimerRef.current !== null) {
          clearInterval(progressTimerRef.current)
          progressTimerRef.current = null
        }
        void sdk.notifications.show({ id: 2026, title: 'GPUIX 下载完成', body: '已到达 100%，点击可唤起应用' })
        pushLog('success', '进度通知已完成 100%')
      }
    }, 650)
  }, [sdk, pushLog])

  // ── Audio & TTS ────────────────────────────────────────────────────────────
  const [volumeRatio, setVolumeRatio] = useState<string>('--')
  const [ttsText, setTtsText] = useState('你好，这是 GPUIX 原生语音合成与提示音测试。')

  // ── IME ────────────────────────────────────────────────────────────────────
  const [imeSingle, setImeSingle] = useState('')
  const [imeSubmitted, setImeSubmitted] = useState('')
  const [imeMulti, setImeMulti] = useState('支持拼音输入法组词下划线、Emoji 🎉、与退格删字。')

  // ── Fetch & WebSocket ──────────────────────────────────────────────────────
  const [fetchUrl, setFetchUrl] = useState('https://httpbin.org/get')
  const [fetchResult, setFetchResult] = useState('尚未发起请求')
  const [wsUrl, setWsUrl] = useState('wss://ws.postman-echo.com/raw')
  const [wsMessage, setWsMessage] = useState('Hello GPUIX WebSocket!')
  const [wsState, setWsState] = useState<'disconnected' | 'connecting' | 'open'>('disconnected')
  const [wsEcho, setWsEcho] = useState('未连接')
  const wsRef = useRef<WsLike | null>(null)

  const runFetch = useCallback(async (method: 'GET' | 'POST') => {
    const fetchFn = Reflect.get(globalThis, 'fetch') as FetchFn | undefined
    if (typeof fetchFn !== 'function') {
      pushLog('warning', 'globalThis.fetch 不可用')
      return
    }
    const started = Date.now()
    setFetchResult('请求中...')
    try {
      const resp = await fetchFn(fetchUrl, method === 'POST'
        ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client: 'gpuix-android', ts: started }) }
        : { method: 'GET' })
      const body = await resp.text()
      const elapsed = Date.now() - started
      const summary = `HTTP ${resp.status} (${resp.ok ? 'OK' : 'ERR'}) · ${elapsed}ms · ${body.slice(0, 180)}`
      setFetchResult(summary)
      pushLog(resp.ok ? 'success' : 'warning', `fetch ${method}: ${summary}`)
    } catch (err) {
      const msg = errorText(err)
      setFetchResult(`错误: ${msg}`)
      pushLog('danger', `fetch ${method} 失败: ${msg}`)
    }
  }, [fetchUrl, pushLog])

  const connectWs = useCallback(() => {
    const WsCtor = Reflect.get(globalThis, 'WebSocket') as WsConstructor | undefined
    if (typeof WsCtor !== 'function') {
      pushLog('warning', 'globalThis.WebSocket 不可用')
      return
    }
    if (wsRef.current) {
      wsRef.current.close(1000, 'reconnect')
      wsRef.current = null
    }
    setWsState('connecting')
    setWsEcho('连接中...')
    try {
      const socket = new WsCtor(wsUrl)
      wsRef.current = socket
      socket.onopen = () => {
        setWsState('open')
        setWsEcho('已连接')
        pushLog('success', `WebSocket 已连接: ${wsUrl}`)
      }
      socket.onmessage = (ev) => {
        const payload = typeof ev.data === 'string' ? ev.data : `[binary ${String(ev.data)}]`
        setWsEcho(`收到: ${payload}`)
        pushLog('info', `WS 收到消息: ${payload}`)
      }
      socket.onerror = (ev) => {
        const msg = ev?.message ?? 'socket error'
        setWsEcho(`错误: ${msg}`)
        pushLog('danger', `WS 错误: ${msg}`)
      }
      socket.onclose = (ev) => {
        setWsState('disconnected')
        setWsEcho(`已关闭 (code=${ev?.code ?? 1000})`)
        if (wsRef.current === socket) wsRef.current = null
        pushLog('info', `WebSocket 已关闭 code=${ev?.code ?? 1000}`)
      }
    } catch (err) {
      setWsState('disconnected')
      pushLog('danger', `WebSocket 构造失败: ${errorText(err)}`)
    }
  }, [wsUrl, pushLog])

  const sendWs = useCallback(() => {
    const socket = wsRef.current
    if (!socket || socket.readyState !== 1) {
      pushLog('warning', 'WebSocket 尚未连接')
      return
    }
    try {
      socket.send(wsMessage)
      pushLog('info', `WS 已发送: ${wsMessage}`)
    } catch (err) {
      pushLog('danger', `WS 发送失败: ${errorText(err)}`)
    }
  }, [wsMessage, pushLog])

  // ── Storage & Keystore ─────────────────────────────────────────────────────
  const [storageSummary, setStorageSummary] = useState('尚未读写')

  // ── Hardware: Torch, Biometrics, Sensors, Location, Media ──────────────────
  const [torchOn, setTorchOn] = useState(false)
  const [sensorActive, setSensorActive] = useState<string | null>(null)
  const [sensorLive, setSensorLive] = useState('未启动传感器流')
  const [locationText, setLocationText] = useState('未定位')
  const [mediaText, setMediaText] = useState('未选择媒体')

  // ── System UI, Clipboard, DeepLink, Motion, PlatformView, Dialog ───────────
  const [keepScreenOn, setKeepScreenOn] = useState(false)
  const [clipboardValue, setClipboardValue] = useState('GPUIX 剪贴板测试 123')
  const [initialUrl, setInitialUrl] = useState<string>('无')
  const [lastDeepLink, setLastDeepLink] = useState<string>('等待中')
  const [springGen, setSpringGen] = useState(1)
  const [springStep, setSpringStep] = useState(0)
  const [showWebView, setShowWebView] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  // ── OTA Hot Update & Base Capabilities ─────────────────────────────────────
  const [otaManifestUrl, setOtaManifestUrl] = useState('http://127.0.0.1:8787/manifest.json')
  const [otaState, setOtaState] = useState<OtaState | null>(null)
  const [otaManifest, setOtaManifest] = useState<OtaManifest | null>(null)
  const [otaProgress, setOtaProgress] = useState<string>('尚未检查更新')
  const [appStateText, setAppStateText] = useState<'active' | 'background'>('active')
  const [networkText, setNetworkText] = useState<string>('监听中')
  const [fsSummary, setFsSummary] = useState<string>('尚未操作沙箱文件')

  const refreshOtaState = useCallback(async () => {
    if (!sdk?.ota) return
    try {
      const next = await sdk.ota.getState()
      setOtaState(next)
      if (next.manifestUrl) {
        setOtaManifestUrl(next.manifestUrl)
      }
    } catch (err) {
      pushLog('warning', `读取 OTA 状态失败: ${errorText(err)}`)
    }
  }, [sdk, pushLog])

  useEffect(() => {
    void refreshDevice()
    void refreshOtaState()
    if (!sdk) return
    void sdk.launcher.getInitialUrl().then((r) => {
      if (r.url) setInitialUrl(r.url)
    }).catch(() => undefined)
    void sdk.notifications.areEnabled().then((r) => {
      setNotifStatus(`总开关:${r.enabled ? '开' : '关'} · 权限:${r.permissionGranted ? '已授' : '未授'}`)
    }).catch(() => undefined)
    void sdk.audio.getVolume('music').then((r) => {
      setVolumeRatio(`${Math.round(r.volume * 100)}% (${r.current}/${r.max})`)
    }).catch(() => undefined)

    const unsubNotif = sdk.onEvent('notificationDelivered', (payload) => {
      pushLog('info', `定时通知已送达: ${JSON.stringify(payload)}`)
    })
    const unsubLink = sdk.onDeepLink((url) => {
      setLastDeepLink(url)
      pushLog('info', `收到 DeepLink: ${url}`)
    })
    const unsubOtaProgress = sdk.ota?.onProgress((ev) => {
      const pct = ev.progress >= 0 ? `${Math.round(ev.progress * 100)}%` : `${ev.bytesReceived}B`
      setOtaProgress(`${ev.phase} · ${ev.releaseId} (${pct})`)
    }) ?? (() => undefined)
    const unsubAppState = sdk.onAppStateChange?.((ev) => {
      setAppStateText(ev.state)
      pushLog('info', `App 前后台切换: ${ev.state}`)
    }) ?? (() => undefined)
    const unsubNetwork = sdk.onNetworkChange?.((ev) => {
      setNetworkText(`${ev.connected ? '在线' : '离线'} (${ev.networkType}${ev.isMetered ? '/计费' : ''})`)
      pushLog('info', `网络状态变化: ${ev.networkType} connected=${String(ev.connected)}`)
    }) ?? (() => undefined)

    return () => {
      unsubNotif()
      unsubLink()
      unsubOtaProgress()
      unsubAppState()
      unsubNetwork()
      if (progressTimerRef.current !== null) {
        clearInterval(progressTimerRef.current)
        progressTimerRef.current = null
      }
      if (wsRef.current) {
        wsRef.current.close(1000, 'unmount')
        wsRef.current = null
      }
      for (const sType of ['accelerometer', 'gyroscope', 'light']) {
        void sdk.sensors.stop(sType).catch(() => undefined)
      }
    }
  }, [sdk, refreshDevice, refreshOtaState, pushLog])

  const springTargets = [
    { x: 0, y: 0 },
    { x: 140, y: 0 },
    { x: 140, y: 36 },
    { x: 0, y: 36 },
  ]
  const currentSpring = springTargets[springStep % springTargets.length]
  const springMotion = {
    generation: springGen,
    initial: { translateX: 0, translateY: 0 },
    animate: { translateX: currentSpring.x, translateY: currentSpring.y },
    transition: { type: 'spring', stiffness: 280, damping: 20 },
  } as unknown as MotionProps

  const createIntrinsic = createElement as (type: string, props: Record<string, unknown>) => ReactNode

  const sections: Array<{ key: string; node: ReactNode }> = [
    {
      key: 'header',
      node: <DemoCard title="Android 原生能力实验室" description={sdk ? '已连接真实 Android Native Bridge + Hermes 运行时' : '当前处于桌面端预览；请在 Android 真机 APK 测试系统能力'} badge={sdk ? 'Android 已接通' : '桌面只读'}>
        <WrapRow>
          <Badge tone={sdk ? 'success' : 'warning'}>{sdk ? 'Bridge Ready' : 'Desktop Preview'}</Badge>
          <Badge tone="neutral">{deviceInfo ? `${deviceInfo.brand} ${deviceInfo.model}` : '设备待读取'}</Badge>
          <Badge tone="info">{deviceInfo ? `Android ${deviceInfo.release} (API ${deviceInfo.sdkInt})` : 'API --'}</Badge>
          <Badge tone="neutral">{battery ? `电量 ${battery.level}% ${battery.charging ? '充电中 ' : ''}· ${battery.temperatureC.toFixed(1)}°C` : '电池 --'}</Badge>
          <Button size="sm" variant="secondary" onClick={() => void refreshDevice()}>刷新设备状态</Button>
        </WrapRow>
        {deviceInfo && <text style={{ fontSize: 11, color: C.muted }}>{`分辨率 ${deviceInfo.screenWidthPx}×${deviceInfo.screenHeightPx} · ${deviceInfo.density.toFixed(2)}x · ABI ${deviceInfo.abis.join(', ')} · 网络 ${deviceInfo.networkType}${deviceInfo.isMetered ? '(计费)' : ''}`}</text>}
      </DemoCard>,
    },
    {
      key: 'logs',
      node: <DemoCard title="调用日志回显" description="所有原生调用返回值、事件回调与异常实时追踪" badge={`${logs.length} 条`}>
        <WrapRow>
          <Button size="sm" variant="ghost" onClick={() => setLogs([])}>清空日志</Button>
        </WrapRow>
        {logs.length === 0
          ? <text style={{ fontSize: 12, color: C.muted }}>点击下方任意能力按钮开始实测...</text>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: 10, borderRadius: 8, backgroundColor: C.control, borderWidth: 1, borderColor: C.border }}>
            {logs.slice(0, 8).map((item) => <text key={item.id} style={{ fontSize: 11, color: item.tone === 'danger' ? C.red : item.tone === 'warning' ? C.orange : item.tone === 'success' ? C.green : C.text }}>{`[${item.time}] ${item.text}`}</text>)}
          </div>}
      </DemoCard>,
    },
    {
      key: 'notifications',
      node: <DemoCard title="1. 通知与推送 (Notifications)" description="状态查询、通知权限申请、即时推送、定时延迟推送、下载进度条通知" badge={notifStatus}>
        <WrapRow>
          <Button size="sm" onClick={() => void runTask('检测通知开关', (s) => s.notifications.areEnabled(), (r) => setNotifStatus(`总开关:${r.enabled ? '开' : '关'} · 权限:${r.permissionGranted ? '已授' : '未授'}`))}>检查权限/开关</Button>
          <Button size="sm" variant="secondary" onClick={() => void runTask('申请通知权限', (s) => s.permissions.request(['android.permission.POST_NOTIFICATIONS']))}>申请通知权限 (API 33+)</Button>
          <Button size="sm" variant="primary" onClick={() => void runTask('发送即时通知', (s) => s.notifications.show({ title: 'GPUIX 推送到达', body: `点击跳转原生页 · ${nowLabel()}`, deepLink: 'gpuix://native-demo?from=notification' }))}>立即发通知</Button>
          <Button size="sm" onClick={() => void runTask('3秒定时推送', (s) => s.notifications.schedule({ delayMs: 3000, title: 'GPUIX 定时通知', body: '3 秒后台定时触发测试！', deepLink: 'gpuix://native-demo?from=scheduled' }))}>3 秒后定时推送</Button>
          <Button size="sm" onClick={startProgressNotification}>模拟进度条通知</Button>
          <Button size="sm" variant="destructive" onClick={() => void runTask('清除全部通知', (s) => s.notifications.cancelAll())}>清空通知</Button>
        </WrapRow>
      </DemoCard>,
    },
    {
      key: 'audio',
      node: <DemoCard title="2. 系统提示音、音量与 TTS 语音" description="RingtoneManager / ToneGenerator / AudioManager / Android TextToSpeech" badge={`媒体音量 ${volumeRatio}`}>
        <WrapRow>
          {[
            { type: 'notification', label: '通知音' },
            { type: 'alarm', label: '闹钟音' },
            { type: 'ringtone', label: '铃声' },
            { type: 'click', label: '按键音' },
            { type: 'success', label: '成功 ACK' },
            { type: 'error', label: '失败 NACK' },
            { type: 'dtmf', label: '拨号 DTMF' },
            { type: 'beep', label: '蜂鸣 Beep' },
          ].map((item) => <Button key={item.type} size="sm" onClick={() => void runTask(`播放 ${item.label}`, (s) => s.audio.playTone(item.type))}>{item.label}</Button>)}
        </WrapRow>
        <WrapRow>
          <Button size="sm" variant="secondary" onClick={() => void runTask('读取音量', (s) => s.audio.getVolume('music'), (r) => setVolumeRatio(`${Math.round(r.volume * 100)}% (${r.current}/${r.max})`))}>读取音量</Button>
          <Button size="sm" onClick={() => void runTask('音量 30%', (s) => s.audio.setVolume(0.3, 'music'), (r) => setVolumeRatio(`${Math.round(r.volume * 100)}% (${r.current}/${r.max})`))}>设为 30%</Button>
          <Button size="sm" onClick={() => void runTask('音量 75%', (s) => s.audio.setVolume(0.75, 'music'), (r) => setVolumeRatio(`${Math.round(r.volume * 100)}% (${r.current}/${r.max})`))}>设为 75%</Button>
        </WrapRow>
        <Input label="TTS 朗读内容" value={ttsText} onChange={setTtsText} placeholder="输入要语音播报的文字" />
        <WrapRow>
          <Button size="sm" variant="primary" onClick={() => void runTask('TTS 语音播报', (s) => s.audio.speak(ttsText, { rate: 1.0, pitch: 1.0 }))}>开始语音播报</Button>
          <Button size="sm" variant="ghost" onClick={() => void runTask('停止播报', (s) => s.audio.stopSpeak())}>停止播报</Button>
        </WrapRow>
      </DemoCard>,
    },
    {
      key: 'haptics',
      node: <DemoCard title="3. 触感反馈与波形震动 (Haptics)" description="HapticFeedbackConstants 与 VibrationEffect 硬件马达驱动">
        <WrapRow>
          {[
            { style: 'light', label: '轻触 Light' },
            { style: 'medium', label: '中等 Medium' },
            { style: 'heavy', label: '重击 Heavy' },
            { style: 'selection', label: '选择 Selection' },
            { style: 'success', label: '成功' },
            { style: 'error', label: '错误' },
          ].map((item) => <Button key={item.style} size="sm" onClick={() => void runTask(`触感 ${item.style}`, (s) => s.haptics.impact(item.style))}>{item.label}</Button>)}
          <Button size="sm" variant="secondary" onClick={() => void runTask('短震 100ms', (s) => s.haptics.vibrate({ durationMs: 100 }))}>短震 100ms</Button>
          <Button size="sm" variant="primary" onClick={() => void runTask('SOS 波形震动', (s) => s.haptics.vibrate({ pattern: [0, 80, 70, 80, 70, 80, 140, 220, 70, 220] }))}>SOS 节奏震动</Button>
        </WrapRow>
      </DemoCard>,
    },
    {
      key: 'ime',
      node: <DemoCard title="4. 中文软键盘 IME 实验室" description="验证 GpuiImeView InputConnection 拼音下划线组词、候选词上屏、退格与换行">
        <text style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>单行输入框（支持拼音与回车提交）：</text>
        <input
          value={imeSingle}
          placeholder="点击调起中文键盘，输入拼音/Emoji 后按回车..."
          onChange={(ev) => setImeSingle(ev.value ?? '')}
          onSubmit={(ev) => {
            const val = ev.value ?? imeSingle
            setImeSubmitted(val)
            pushLog('success', `IME 提交: ${val}`)
          }}
          style={{ height: 40, paddingLeft: 12, paddingRight: 12, borderRadius: 8, borderWidth: 1, borderColor: C.borderStrong, backgroundColor: C.input, color: C.text, fontSize: 13 }}
        />
        <text style={{ fontSize: 11, color: C.muted }}>{`当前值：${imeSingle || '(空)'} · 长度 ${imeSingle.length} · 最近提交：${imeSubmitted || '无'}`}</text>
        <text style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>多行文本域（textarea）：</text>
        <textarea
          value={imeMulti}
          minRows={3}
          maxRows={6}
          placeholder="多行中文/英文混排测试..."
          onChange={(ev) => setImeMulti(ev.value ?? '')}
          style={{ padding: 10, borderRadius: 8, borderWidth: 1, borderColor: C.borderStrong, backgroundColor: C.input, color: C.text, fontSize: 13 }}
        />
      </DemoCard>,
    },
    {
      key: 'net',
      node: <DemoCard title="5. 原生网络 fetch (Rust TLS) & WebSocket" description="AsyncTask reqwest_client HTTP/HTTPS + RFC6455 原生 WebSocket 客户端">
        <Input label="HTTP(S) URL" value={fetchUrl} onChange={setFetchUrl} placeholder="https://httpbin.org/get" />
        <WrapRow>
          <Button size="sm" variant="primary" onClick={() => void runFetch('GET')}>fetch GET</Button>
          <Button size="sm" variant="secondary" onClick={() => void runFetch('POST')}>fetch POST JSON</Button>
        </WrapRow>
        <text style={{ fontSize: 11, color: C.muted }}>{fetchResult}</text>
        <Separator />
        <Input label="WebSocket URL" value={wsUrl} onChange={setWsUrl} placeholder="wss://ws.postman-echo.com/raw" />
        <Input label="发送内容" value={wsMessage} onChange={setWsMessage} placeholder="输入要发送的 WS 消息" />
        <WrapRow>
          <Badge tone={wsState === 'open' ? 'success' : wsState === 'connecting' ? 'warning' : 'neutral'}>{wsState}</Badge>
          <Button size="sm" variant="primary" onClick={connectWs}>连接 WS</Button>
          <Button size="sm" variant="secondary" onClick={sendWs}>发送消息</Button>
          <Button size="sm" variant="ghost" onClick={() => wsRef.current?.close(1000, 'user')}>断开</Button>
        </WrapRow>
        <text style={{ fontSize: 11, color: C.muted }}>{wsEcho}</text>
      </DemoCard>,
    },
    {
      key: 'storage',
      node: <DemoCard title="6. SharedPreferences & Android Keystore 加密存储" description="同步 localStorage 与硬件 AES-256-GCM 密钥库">
        <WrapRow>
          <Button size="sm" onClick={() => {
            const ls = Reflect.get(globalThis, 'localStorage') as StorageLike | undefined
            if (!ls) { pushLog('warning', 'localStorage 不可用'); return }
            const val = `gpuix-${nowLabel()}`
            ls.setItem('demo_key', val)
            const readBack = ls.getItem('demo_key')
            const summary = `localStorage 写入=${val}, 读回=${readBack}, 总键数=${ls.length}`
            setStorageSummary(summary)
            pushLog('success', summary)
          }}>localStorage 写+读</Button>
          <Button size="sm" variant="secondary" onClick={() => void runTask('列举 KV Keys', (s) => s.storage.keys(), (r) => setStorageSummary(`KV Keys: ${r.keys.join(', ')}`))}>查看全部 Keys</Button>
          <Button size="sm" variant="primary" onClick={() => void runTask('Keystore 加密写', (s) => s.secureStorage.write('gpuix_demo', 'token', `secret-${nowLabel()}`))}>Keystore 加密写</Button>
          <Button size="sm" onClick={() => void runTask('Keystore 解密读', (s) => s.secureStorage.read('gpuix_demo', 'token'), (r) => setStorageSummary(`Keystore 解密结果: ${r.value ?? 'null'}`))}>Keystore 解密读</Button>
          <Button size="sm" variant="destructive" onClick={() => void runTask('删除 Keystore 项', (s) => s.secureStorage.delete('gpuix_demo', 'token'))}>删除加密项</Button>
        </WrapRow>
        <text style={{ fontSize: 11, color: C.muted }}>{storageSummary}</text>
      </DemoCard>,
    },
    {
      key: 'hardware',
      node: <DemoCard title="7. 硬件外设（手电筒 / 生物识别 / 传感器 / GPS）" description="Camera2 Torch, BiometricPrompt, SensorManager, LocationManager">
        <WrapRow>
          <Button size="sm" variant={torchOn ? 'primary' : 'secondary'} onClick={() => void runTask(`手电筒 ${torchOn ? '关' : '开'}`, (s) => s.torch.setEnabled(!torchOn), (r) => setTorchOn(r.enabled))}>{torchOn ? '关闭手电筒' : '打开手电筒'}</Button>
          <Button size="sm" onClick={() => void runTask('检测生物识别', (s) => s.biometrics.canAuthenticate())}>检测指纹/面容</Button>
          <Button size="sm" variant="primary" onClick={() => void runTask('调起生物识别', (s) => s.biometrics.authenticate({ title: 'GPUIX 安全验证', subtitle: '请验证指纹或锁屏密码' }))}>验证指纹/面容</Button>
        </WrapRow>
        <WrapRow>
          <Button size="sm" onClick={() => void runTask('光线传感器单次采样', (s) => s.sensors.sample('light'), (r) => setSensorLive(`光线: ${r.values.join(', ')} lux`))}>采样光线传感器</Button>
          <Button size="sm" variant={sensorActive === 'accelerometer' ? 'primary' : 'secondary'} onClick={() => {
            if (sensorActive === 'accelerometer') {
              void runTask('停止加速度计', (s) => s.sensors.stop('accelerometer'), () => setSensorActive(null))
            } else {
              void runTask('启动加速度计', (s) => s.sensors.start('accelerometer', 120), () => setSensorActive('accelerometer'))
            }
          }}>{sensorActive === 'accelerometer' ? '停止加速度流' : '实时监听加速度'}</Button>
          <Button size="sm" onClick={() => void runTask('申请定位权限', (s) => s.permissions.request(['android.permission.ACCESS_FINE_LOCATION', 'android.permission.ACCESS_COARSE_LOCATION']))}>申请定位权限</Button>
          <Button size="sm" onClick={() => void runTask('获取当前位置', (s) => s.location.getCurrentPosition(), (r) => setLocationText(`${r.latitude.toFixed(5)}, ${r.longitude.toFixed(5)} (±${Math.round(r.accuracy)}m ${r.provider})`))}>获取 GPS 位置</Button>
        </WrapRow>
        <SensorReadout sdk={sdk} active={sensorActive} singleSample={sensorLive} />
        <text style={{ fontSize: 11, color: C.muted }}>{`定位：${locationText}`}</text>
      </DemoCard>,
    },
    {
      key: 'media',
      node: <DemoCard title="8. 相机拍照 & 相册选图 & 文件选择器" description="ActivityResult + ContentResolver 流式缓存落地">
        <WrapRow>
          <Button size="sm" variant="primary" onClick={() => void runTask('拍照', (s) => s.media.takePhoto(), (r) => setMediaText(r.cancelled ? '已取消拍照' : `照片: ${r.path ?? r.uri} (${r.width ?? 0}x${r.height ?? 0}, ${r.size ?? 0}B)`))}>相机拍照</Button>
          <Button size="sm" variant="secondary" onClick={() => void runTask('相册选图', (s) => s.media.pickImage(), (r) => setMediaText(r.cancelled ? '已取消选图' : `图片: ${r.name ?? ''} (${r.size ?? 0}B) ${r.path ?? ''}`))}>相册选图</Button>
          <Button size="sm" onClick={() => void runTask('选择文件', (s) => s.media.pickFile('*/*'), (r) => setMediaText(r.cancelled ? '已取消选文件' : `文件: ${r.name ?? ''} [${r.mimeType ?? ''}] (${r.size ?? 0}B)`))}>选择任意文件</Button>
        </WrapRow>
        <text style={{ fontSize: 11, color: C.muted }}>{mediaText}</text>
      </DemoCard>,
    },
    {
      key: 'system',
      node: <DemoCard title="9. 系统弹窗、亮度常亮、剪贴板、分享与 DeepLink" description="Toast / AlertDialog / Window Flags / Clipboard / Intent / DeepLink">
        <WrapRow>
          <Button size="sm" onClick={() => void runTask('原生 Toast', (s) => s.system.toast('来自 GPUIX 原生桥的 Toast 提示！'))}>原生 Toast</Button>
          <Button size="sm" variant="secondary" onClick={() => void runTask('原生 AlertDialog', (s) => s.system.alert({ title: '原生确认框', message: '这是由 Android AlertDialog 渲染的系统弹窗。', confirmText: '确认', cancelText: '取消' }))}>原生确认弹窗</Button>
          <Button size="sm" onClick={() => void runTask('屏幕亮度 25%', (s) => s.system.setBrightness(0.25))}>亮度 25%</Button>
          <Button size="sm" onClick={() => void runTask('屏幕亮度 95%', (s) => s.system.setBrightness(0.95))}>亮度 95%</Button>
          <Button size="sm" variant="ghost" onClick={() => void runTask('恢复自动亮度', (s) => s.system.setBrightness(-1))}>自动亮度</Button>
        </WrapRow>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
          <text style={{ fontSize: 13, fontWeight: 600, color: C.text }}>屏幕保持常亮 (FLAG_KEEP_SCREEN_ON)</text>
          <Switch checked={keepScreenOn} onCheckedChange={(next) => {
            setKeepScreenOn(next)
            void runTask(`常亮=${String(next)}`, (s) => s.system.setKeepScreenOn(next))
          }} />
        </div>
        <Input label="剪贴板内容" value={clipboardValue} onChange={setClipboardValue} />
        <WrapRow>
          <Button size="sm" variant="primary" onClick={() => void runTask('写入剪贴板', (s) => s.clipboard.write(clipboardValue))}>写入剪贴板</Button>
          <Button size="sm" variant="secondary" onClick={() => void runTask('读取剪贴板', (s) => s.clipboard.read(), (r) => { if (r.text !== null) setClipboardValue(r.text) })}>读取剪贴板</Button>
          <Button size="sm" onClick={() => void runTask('系统分享', (s) => s.launcher.share({ title: 'GPUIX Android 原生能力测试', text: 'GPUIX React + Hermes + Rust GPUI 真机实测！', url: 'https://github.com' }))}>系统分享面板</Button>
          <Button size="sm" onClick={() => void runTask('打开应用设置', (s) => s.system.openAppSettings())}>打开系统设置页</Button>
        </WrapRow>
        <text style={{ fontSize: 11, color: C.muted }}>{`冷启 DeepLink：${initialUrl} · 最新 DeepLink：${lastDeepLink}`}</text>
      </DemoCard>,
    },
    {
      key: 'motion',
      node: <DemoCard title="10. GPU 弹簧平移、Hybrid WebView 与返回键拦截" description="零重排 translateX/Y 弹簧动画 + Android 原生 WebView 混合合成 + 浮层优先返回">
        <WrapRow>
          <Button size="sm" variant="primary" onClick={() => { setSpringStep((v) => v + 1); setSpringGen((g) => g + 1) }}>弹簧位移步进 ({springStep % 4}/3)</Button>
          <Button size="sm" variant="secondary" onClick={() => setDialogOpen(true)}>打开浮层测返回键</Button>
          <Button size="sm" variant={showWebView ? 'destructive' : 'secondary'} onClick={() => setShowWebView((v) => !v)}>{showWebView ? '收起原生 WebView' : '展开原生 WebView'}</Button>
        </WrapRow>
        <div style={{ height: 84, borderRadius: 8, backgroundColor: C.control, borderWidth: 1, borderColor: C.border, padding: 8, overflow: 'hidden' }}>
          <div
            motion={springMotion}
            style={{ width: 120, height: 32, borderRadius: 8, backgroundColor: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <text style={{ fontSize: 11, fontWeight: 700, color: C.primaryForeground }}>GPU Spring</text>
          </div>
        </div>
        {showWebView && <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <text style={{ fontSize: 11, color: C.muted }}>下方矩形为嵌入式 Android 原生 WebView (Hybrid Composition)：</text>
          {createIntrinsic('platform-view', {
            viewType: 'webview',
            html: '<!doctype html><html><body style="margin:0;padding:14px;font-family:sans-serif;background:#18181b;color:#f4f4f5;"><h3 style="margin:0 0 6px;color:#a78bfa;">Android PlatformView (WebView)</h3><p style="margin:0 0 10px;font-size:13px;">嵌入式原生 Android 视图已与 GPUI Vulkan 画布同步坐标与可见性。</p><button onclick="document.getElementById(\'c\').textContent = Number(document.getElementById(\'c\').textContent) + 1" style="padding:8px 14px;border-radius:6px;border:0;background:#7c3aed;color:#fff;font-weight:bold;">原生 DOM 点击计数: <span id="c">0</span></button></body></html>',
            style: { width: '100%', height: 180, borderRadius: 8, borderWidth: 1, borderColor: C.borderStrong },
          })}
        </div>}
      </DemoCard>,
    },
    {
      key: 'ota',
      node: <DemoCard
        title="11. OTA 生产热更新（免重装 APK）"
        description="基于静态 manifest.json + Hermes .hbc + SHA-256 / ECDSA 验签 + 崩溃自愈回滚"
        badge={otaState ? `${otaState.source.toUpperCase()} · ${otaState.confirmed ? '已确认' : '待确认'}` : '待读取'}
      >
        <WrapRow>
          <Badge tone={otaState?.source === 'ota' ? 'success' : 'info'}>
            {otaState ? `运行源: ${otaState.source}` : '运行源: --'}
          </Badge>
          <Badge tone="neutral">{otaState ? `runtime ${otaState.runtimeVersion} (${otaState.channel})` : 'runtime --'}</Badge>
          <Badge tone={otaState?.stagedReleaseId ? 'warning' : 'neutral'}>
            {otaState?.stagedReleaseId ? `待生效: ${otaState.stagedReleaseId}` : '无 staged 包'}
          </Badge>
          {otaState?.rescueMode ? <Badge tone="danger">Rescue 救援中</Badge> : null}
        </WrapRow>
        <Input label="Manifest URL" value={otaManifestUrl} onChange={setOtaManifestUrl} placeholder="https://.../manifest.json" />
        <WrapRow>
          <Button size="sm" variant="secondary" onClick={() => void runTask('读取 OTA 状态', (s) => s.ota.getState(), (r) => setOtaState(r))}>刷新状态</Button>
          <Button size="sm" onClick={() => void runTask('检查 OTA 更新', (s) => s.ota.check({ manifestUrl: otaManifestUrl }), (r) => {
            setOtaManifest(r.manifest)
            setOtaProgress(r.available ? `发现新版本 ${r.manifest.releaseId} (${r.manifest.bundle?.size ?? 0}B)` : `无需更新 (${r.reason ?? 'up_to_date'})`)
            void refreshOtaState()
          })}>检查更新</Button>
          <Button size="sm" variant="primary" onClick={() => void runTask('下载 OTA 包', (s) => s.ota.download(otaManifest ? { manifest: otaManifest } : { manifestUrl: otaManifestUrl }), (r) => {
            setOtaState(r)
            setOtaProgress(`已下载并校验: ${r.releaseId}`)
          })}>下载包</Button>
          <Button size="sm" variant="primary" onClick={() => void runTask('立即热切换', (s) => s.ota.apply({ mode: 'hot' }), (r) => {
            setOtaState(r)
            setOtaProgress(`正在热切换至 ${r.releaseId}...`)
          })}>立即热切换</Button>
          <Button size="sm" variant="secondary" onClick={() => void runTask('冷重启生效', (s) => s.ota.apply({ mode: 'restart' }), (r) => setOtaState(r))}>冷重启生效</Button>
          <Button size="sm" onClick={() => void runTask('确认当前 OTA 稳定', (s) => s.ota.confirm(), (r) => setOtaState(r))}>确认稳定</Button>
          <Button size="sm" variant="destructive" onClick={() => void runTask('回滚版本', (s) => s.ota.rollback({ applyNow: true, mode: 'hot', reason: 'manual demo rollback' }), (r) => setOtaState(r))}>回滚</Button>
          <Button size="sm" variant="ghost" onClick={() => void runTask('重置回内置包', (s) => s.ota.reset({ applyNow: true }), (r) => setOtaState(r))}>重置回内置</Button>
        </WrapRow>
        <text style={{ fontSize: 11, color: C.muted }}>
          {otaState
            ? `当前 Release: ${otaState.currentReleaseId ?? '(APK 内置)'} · BuildID: ${otaState.embeddedBuildId.slice(0, 12) || '--'} · HBCv${otaState.hbcVersion ?? '--'} · Streak: ${otaState.bootCrashStreak ?? 0} · 黑名单: ${otaState.failedReleaseIds.join(', ') || '无'} · 回滚原因: ${otaState.lastRollbackReason ?? '无'}`
            : '请连接 Android 宿主后读取 OTA 状态（可配合 gpuix ota serve 本地联调）'}
        </text>
        <WrapRow>
          <Button size="sm" variant="secondary" onClick={() => void runTask('沙箱文件写入+读取', async (s) => {
            if (!s.fs) throw new Error('fs 插件未就绪')
            await s.fs.writeText('demo/hello.txt', `GPUIX @ ${Date.now()}`, { scope: 'cache' })
            const readRes = await s.fs.readText('demo/hello.txt', 'cache')
            const info = await s.fs.getStorageInfo()
            return { readRes, info }
          }, (r) => setFsSummary(`已读写: "${r.readRes.content}" · 可用 ${Math.round(r.info.filesAvailableBytes / (1024 * 1024))} MiB`))}>测试沙箱 FS</Button>
        </WrapRow>
        <text style={{ fontSize: 11, color: C.muted }}>{`状态/进度：${otaProgress} · 前后台: ${appStateText} · 网络: ${networkText} · ${fsSummary}`}</text>
      </DemoCard>,
    },
  ]

  return <div style={{ flexGrow: 1, minHeight: 0, width: '100%', display: 'flex', flexDirection: 'column' }}>
    <virtual-list
      itemCount={sections.length}
      windowStart={0}
      estimatedItemHeight={220}
      overdraw={320}
      style={{ flexGrow: 1, minHeight: 0, width: '100%' }}
    >
      {sections.map((section, idx) => (
        <div key={section.key} style={{ width: '100%', paddingBottom: idx === sections.length - 1 ? 24 : 14 }}>
          {section.node}
        </div>
      ))}
    </virtual-list>

    <Dialog.Root open={dialogOpen} onOpenChange={(next) => setDialogOpen(next)}>
      <Dialog.Backdrop />
      <Dialog.Popup>
        <Dialog.Title>返回键 / 预测性返回测试浮层</Dialog.Title>
        <Dialog.Description>在 Android 上使用系统侧滑返回或返回键时，Overlay 注册的后进先出 useBackHandler 会优先关闭本弹窗，而不是直接退出页面。</Dialog.Description>
        <Dialog.Close />
      </Dialog.Popup>
    </Dialog.Root>
  </div>
}

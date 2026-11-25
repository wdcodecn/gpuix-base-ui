import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { render, useGpuix } from '@gpuix/react'
import type { DebugFrameOverlayStats, NativeRenderer } from '@gpuix/react'
import { Badge, Button, Card, Glyph, IconButton, Input, List, Popover, Select, Switch, Tabs, ThemeProvider, useBackHandler, useTheme, type ThemeMode } from './src'
import { useViewportInsets, useViewportSize } from './src/base/foundations'
import { Gallery } from './gallery'
import { NativeCapabilitiesDemo, type GpuixNativeSdk } from './native-demo'

type AppInfo = {
  appId: string
  appName: string
  versionName: string
  versionCode: number
  platform: string
  channel: string
  runtimeVersion: string
  buildHash: string
}

function readStringField(source: object, key: string, fallback: string): string {
  const value = Reflect.get(source, key)
  return typeof value === 'string' && value.length > 0 ? value : fallback
}

function readNumberField(source: object, key: string, fallback: number): number {
  const value = Reflect.get(source, key)
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function readAppInfo(): AppInfo {
  const raw = Reflect.get(globalThis, '__gpuixAppInfo')
  const runtimePlatform = Reflect.get(globalThis, '__gpuixPlatform')
  const defaultPlatform =
    typeof runtimePlatform === 'string' && runtimePlatform.length > 0
      ? runtimePlatform
      : Reflect.get(globalThis, '__gpuixAndroid')
        ? 'android'
        : 'desktop'
  if (typeof raw !== 'object' || raw === null) {
    return {
      appId: 'dev.gpuix.baseui',
      appName: 'GPUIX Base UI',
      versionName: '1.0.0',
      versionCode: 1,
      platform: defaultPlatform,
      channel: 'local',
      runtimeVersion: '1',
      buildHash: 'dev',
    }
  }
  return {
    appId: readStringField(raw, 'appId', 'dev.gpuix.baseui'),
    appName: readStringField(raw, 'appName', 'GPUIX Base UI'),
    versionName: readStringField(raw, 'versionName', '1.0.0'),
    versionCode: readNumberField(raw, 'versionCode', 1),
    platform: readStringField(raw, 'platform', defaultPlatform),
    channel: readStringField(raw, 'channel', 'local'),
    runtimeVersion: readStringField(raw, 'runtimeVersion', '1'),
    buildHash: readStringField(raw, 'buildHash', 'dev'),
  }
}

function isMobileHost(): boolean {
  return Boolean(Reflect.get(globalThis, '__gpuixMobile') || Reflect.get(globalThis, '__gpuixAndroid'))
}

type PageId = 'home' | 'native' | 'proxies' | 'subscriptions' | 'connections' | 'rules' | 'logs' | 'tests' | 'components' | 'settings'

const NAV: { id: PageId; label: string; icon: string }[] = [
  { id: 'home', label: '首页', icon: '▣' },
  { id: 'native', label: '原生', icon: '✦' },
  { id: 'proxies', label: '代理', icon: '◇' },
  { id: 'subscriptions', label: '订阅', icon: '▤' },
  { id: 'connections', label: '连接', icon: '◎' },
  { id: 'rules', label: '规则', icon: '⌘' },
  { id: 'logs', label: '日志', icon: '≡' },
  { id: 'tests', label: '测试', icon: '▷' },
  { id: 'components', label: '组件', icon: '◇' },
  { id: 'settings', label: '设置', icon: '◌' },
]

const TITLES: Record<PageId, string> = {
  home: '首页', native: '原生能力', proxies: '代理组', subscriptions: '订阅管理', connections: '活动连接', rules: '规则配置', logs: '运行日志', tests: '网络测试', components: '组件工作台', settings: '设置',
}

function useResponsiveViewport() {
  // Uses native viewport push events when available (0 timer wakeups on mobile)
  // and shares a single 250ms observer across callers on desktop.
  const size = useViewportSize({ intervalMs: 250 })
  const landscape = size.width > size.height
  // Phones in landscape often report a wide logical width but a very short
  // height. Keep the mobile shell in that case so we do not switch to the
  // desktop sidebar just because the device rotated.
  const mobile = size.width < 760 || (landscape && size.height < 560)
  return { ...size, landscape, mobile, compact: mobile && landscape }
}

type PerformanceSnapshot = { stats: DebugFrameOverlayStats; drawRate: number }

const FRAME_SAMPLE_INTERVAL_MS = 1000
const MIN_ACTIVE_DRAWS_PER_SAMPLE = 4

function usePerformanceSnapshot(renderer: NativeRenderer | null, enabled: boolean, resetCount: number) {
  const [snapshot, setSnapshot] = useState<PerformanceSnapshot | null>(null)

  useEffect(() => {
    if (!enabled || !renderer?.getDebugFrameOverlayStats) {
      setSnapshot(null)
      return
    }

    let timer: ReturnType<typeof setInterval> | undefined
    const readStats = () => {
      try {
        return renderer.getDebugFrameOverlayStats?.() ?? null
      } catch {
        clearInterval(timer)
        setSnapshot(null)
        return null
      }
    }

    const initial = readStats()
    if (!initial) return
    let lastFrame = initial.frames
    let lastSampleAt = performance.now()
    setSnapshot({ stats: initial, drawRate: 0 })
    timer = setInterval(() => {
      const stats = readStats()
      if (!stats) return
      const now = performance.now()
      const frames = stats.frames - lastFrame
      const elapsed = Math.max(1, now - lastSampleAt)
      lastFrame = stats.frames
      lastSampleAt = now
      // Updating the meter can trigger a short batch of native redraws.
      // Keep that batch, and other isolated updates, out of the active rate.
      if (frames < MIN_ACTIVE_DRAWS_PER_SAMPLE) {
        setSnapshot((current) => current?.drawRate ? { ...current, drawRate: 0 } : current)
        return
      }
      setSnapshot({ stats, drawRate: Math.round(frames * 1000 / elapsed) })
    }, FRAME_SAMPLE_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [enabled, renderer, resetCount])

  return snapshot
}

function PerformanceControl({ compact = false, panelGap = 8 }: { compact?: boolean; panelGap?: number }) {
  const { renderer } = useGpuix()
  const { tokens: C } = useTheme()
  const [mode, setMode] = useState<'off' | 'compact' | 'expanded'>('off')
  const [resetCount, setResetCount] = useState(0)
  const snapshot = usePerformanceSnapshot(renderer, mode !== 'off', resetCount)
  const drawRate = snapshot?.drawRate ?? 0
  const stats = snapshot?.stats
  const rateLabel = drawRate ? `${drawRate}/s` : '待滑动'
  const reset = () => {
    try {
      renderer?.resetDebugFrameOverlayStats?.()
      setResetCount((count) => count + 1)
    } catch {
      setMode('off')
    }
  }
  const formatTime = (ms?: number | null) => ms == null ? '—' : `${ms.toFixed(1)} ms`
  return <Popover.Root open={mode === 'expanded'} onOpenChange={(open) => setMode(open ? 'expanded' : 'compact')}>
    <Popover.Trigger
      testId="performance-trigger"
      ariaLabel="帧率诊断"
      style={{ width: 66, minHeight: compact ? 34 : 40, flexShrink: 0, justifyContent: 'center', gap: 6, paddingLeft: 6, paddingRight: 6 }}
    >
      {mode !== 'off' && <div style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: C.violet }} />}
      <text style={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', color: C.text }}>
        {mode === 'off' ? '帧率' : snapshot ? rateLabel : '—'}
      </text>
    </Popover.Trigger>
    <Popover.Positioner side="bottom" align="end" gap={panelGap}>
      <Popover.Popup testId="performance-panel" style={{ width: 240, minWidth: 0, padding: 12, gap: 10, borderRadius: 12, backgroundColor: C.panel, boxShadow: { offsetX: 0, offsetY: 5, blurRadius: 16, spreadRadius: 0, color: C.shadow } }}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <text style={{ fontSize: 13, fontWeight: 700, color: C.text }}>帧率诊断</text>
          <Button size="sm" variant="ghost" ariaLabel="收起帧率诊断" onClick={() => setMode('compact')}>收起</Button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingLeft: 10, paddingRight: 10, paddingTop: 8, paddingBottom: 8, borderRadius: 8, backgroundColor: C.control }}>
          <text style={{ fontSize: 22, fontWeight: 750, color: C.text }}>{drawRate ? String(drawRate) : snapshot ? '待滑动' : '—'}</text>
          <text style={{ fontSize: 11, color: C.muted }}>{drawRate ? '次绘制/秒' : snapshot ? '绘制速率' : '统计不可用'}</text>
        </div>
        <div style={{ display: 'flex', flexDirection: 'row', gap: 8 }}>
          {[
            { label: '最近', value: stats?.currentMs },
            { label: 'P99', value: stats?.p99Ms },
            { label: '最慢', value: stats?.maxMs },
          ].map(({ label, value }) => <div key={label} style={{ flexBasis: 0, flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <text style={{ fontSize: 10, color: C.muted }}>{label}</text>
            <text style={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', color: C.text }}>{formatTime(value)}</text>
          </div>)}
        </div>
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', gap: 6, paddingTop: 5, borderTopWidth: 1, borderColor: C.border }}>
          <Button size="sm" variant="ghost" disabled={!stats} onClick={reset}>清零</Button>
          <Button size="sm" variant="secondary" onClick={() => setMode('off')}>停止采样</Button>
        </div>
      </Popover.Popup>
    </Popover.Positioner>
  </Popover.Root>
}

const NODES = [
  { name: '高级 | 新加坡 01', region: 'SG', latency: 92 }, { name: '高级 | 新加坡 02', region: 'SG', latency: 117 },
  { name: '高级 | 香港 01', region: 'HK', latency: 58 }, { name: '高级 | 香港 02', region: 'HK', latency: 102 },
  { name: '高级 | 日本 01', region: 'JP', latency: 79 }, { name: '高级 | 日本 02', region: 'JP', latency: 89 },
  { name: '高级 | 美国 01', region: 'US', latency: 253 }, { name: '高级 | 台湾 01', region: 'TW', latency: 310 },
  { name: '高级 | 德国 01', region: 'DE', latency: 238 },
]

const nodeItems = NODES.map((node) => ({ value: node.name, label: node.name }))

const PROXY_ROWS = Array.from({ length: 5000 }, (_, index) => {
  const base = NODES[index % NODES.length]
  const jitter = (index * 17) % 53
  return { id: `${base.name}-${index}`, name: `${base.name} · #${String(index + 1).padStart(4, '0')}`, region: base.region, latency: base.latency + jitter, protocol: index % 4 === 0 ? 'Hysteria2' : 'AnyTLS', location: base.name.split(' | ')[1] }
})

function NavItem({ active, label, icon, onClick }: { active: boolean; label: string; icon: string; onClick: () => void }) {
  return <Button testId={`nav-${label}`} width="100%" justify="start" variant={active ? 'primary' : 'ghost'} onClick={onClick} icon={icon}>{label}</Button>
}

function PageContent({ page, onNavigate, refreshRateSetting, portraitPhone }: {
  page: PageId
  onNavigate: (page: PageId) => void
  refreshRateSetting: RefreshRateSettingProps
  portraitPhone: boolean
}) {
  if (page === 'home') return <Home onNavigate={onNavigate} stacked={portraitPhone} />
  if (page === 'native') return <NativeCapabilitiesDemo />
  if (page === 'proxies') return <Proxies mobile={portraitPhone} />
  if (page === 'subscriptions') return <Subscriptions stacked={portraitPhone} />
  if (page === 'connections') return <Connections stacked={portraitPhone} />
  if (page === 'components') return <Gallery />
  if (page === 'settings') return <Settings refreshRateSetting={refreshRateSetting} stacked={portraitPhone} />
  return <Placeholder page={page} />
}

function Shell() {
  const [page, setPage] = useState<PageId>('home')
  const refreshRatePreference = useRef(DEFAULT_REFRESH_RATE_PREFERENCE)
  const rememberRefreshRate = useCallback((next: RefreshRatePreference) => {
    refreshRatePreference.current = next
  }, [])
  const refreshRateSetting = { initialValue: refreshRatePreference.current, onChange: rememberRefreshRate }
  const { tokens: C, mode, setMode } = useTheme()
  const { width, mobile, compact: landscapeCompact } = useResponsiveViewport()
  const insets = useViewportInsets({ intervalMs: 250 })
  const compact = width < 1180
  const ownsScroll = page === 'proxies' || page === 'native' || page === 'components' || (mobile && !landscapeCompact && (page === 'settings' || page === 'home' || page === 'subscriptions' || page === 'connections'))
  useBackHandler(page !== 'home', () => {
    setPage('home')
    return true
  })
  useEffect(() => {
    const rawSdk: unknown = Reflect.get(globalThis, 'gpuix')
    const sdk = rawSdk && typeof rawSdk === 'object' ? (rawSdk as GpuixNativeSdk) : null
    if (!sdk) return
    void sdk.launcher.getInitialUrl().then((res) => {
      if (typeof res.url === 'string' && res.url.startsWith('gpuix://native-demo')) {
        setPage('native')
      }
    }).catch(() => undefined)
    return sdk.onDeepLink((url) => {
      if (url.startsWith('gpuix://native-demo')) setPage('native')
    })
  }, [])
  const mobileHeaderHeight = landscapeCompact ? 44 : 56
  const mobileNavItemHeight = landscapeCompact ? 34 : 42
  const mobileNavGap = landscapeCompact ? 3 : 4
  const appInfo = useMemo(() => readAppInfo(), [])
  const mobileNavPadding = landscapeCompact ? 5 : 8
  const mobileNavHeight = mobileNavItemHeight * 2 + mobileNavGap + mobileNavPadding * 2 + 1
  const panelGap = landscapeCompact ? 8 : (mobileHeaderHeight - 40) / 2 + mobileNavHeight + 8

  if (mobile) return <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', paddingTop: insets.effective.top, paddingBottom: insets.effective.bottom, paddingLeft: insets.effective.left, paddingRight: insets.effective.right, backgroundColor: C.canvas, color: C.text, fontFamily: 'sans-serif' }}>
    <div style={{ height: mobileHeaderHeight, flexShrink: 0, display: 'flex', flexDirection: 'row', alignItems: 'center', paddingLeft: landscapeCompact ? 10 : 16, paddingRight: landscapeCompact ? 10 : 16, gap: landscapeCompact ? 7 : 10, backgroundColor: C.panel }}>
      <text style={{ flexGrow: 1, fontSize: 20, fontWeight: 800, color: C.text }}>{TITLES[page]}</text>
      <Badge tone="info">{`v${appInfo.versionName}`}</Badge>
      <Button testId="mobile-theme" size="sm" variant="secondary" style={{ height: landscapeCompact ? 36 : 42, minWidth: landscapeCompact ? 58 : 68 }} onClick={() => setMode(mode === 'light' ? 'dark' : 'light')}>{mode === 'light' ? '深色' : '浅色'}</Button>
      <PerformanceControl compact={landscapeCompact} panelGap={panelGap} />
    </div>
    <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', padding: mobileNavPadding, gap: mobileNavGap, backgroundColor: C.panel, borderBottomWidth: 1, borderColor: C.border }}>
      {[NAV.slice(0, 5), NAV.slice(5)].map((items, row) => <div key={row} style={{ display: 'flex', flexDirection: 'row', gap: landscapeCompact ? 3 : 4 }}>{items.map((item) => <Button key={item.id} testId={`nav-${item.label}`} variant={page === item.id ? 'primary' : 'ghost'} style={{ flexGrow: 1, flexBasis: 0, minWidth: 0, height: mobileNavItemHeight, paddingLeft: 4, paddingRight: 4, minHeight: mobileNavItemHeight }} onClick={() => setPage(item.id)}>{item.label}</Button>)}</div>)}
    </div>
    <div key={page} style={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflowY: ownsScroll ? 'hidden' : 'scroll', flexBasis: 0, padding: landscapeCompact ? 8 : 10 }}>
      {/* The scroll viewport measures this child to determine its scroll range. */}
      <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, flexShrink: ownsScroll ? 1 : 0, minHeight: 0, minWidth: 0 }}><PageContent page={page} onNavigate={setPage} refreshRateSetting={refreshRateSetting} portraitPhone={!landscapeCompact} /></div>
    </div>
  </div>
  return <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'row', position: 'relative', paddingTop: insets.effective.top, paddingBottom: insets.effective.bottom, paddingLeft: insets.effective.left, paddingRight: insets.effective.right, backgroundColor: C.canvas, color: C.text, fontFamily: 'Helvetica' }}>
    <div style={{ width: compact ? 190 : 214, flexShrink: 0, display: 'flex', flexDirection: 'column', padding: compact ? 12 : 16, backgroundColor: C.sidebar, borderRightWidth: 1, borderColor: C.border }}>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 11, paddingLeft: 8, paddingRight: 8, paddingTop: 8, paddingBottom: 24 }}>
        <div style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: C.primary }}><Glyph color={C.primaryForeground} size={21}>◇</Glyph></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><div style={{ display: 'flex', flexDirection: 'row' }}><text style={{ fontSize: 17, fontWeight: 800, color: C.text }}>GPU</text><text style={{ fontSize: 17, fontWeight: 800, color: C.violet }}>IX</text></div><text style={{ fontSize: 10, color: C.muted }}>component workbench</text></div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>{NAV.map((item) => <NavItem key={item.id} {...item} active={page === item.id} onClick={() => setPage(item.id)} />)}</div>
      <div style={{ flexGrow: 1 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 12, borderRadius: 10, backgroundColor: C.panel, borderWidth: 1, borderColor: C.border }}>
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><text style={{ fontSize: 11, color: C.muted }}>运行状态</text><Badge tone="success">在线</Badge></div>
        <div style={{ height: 1, backgroundColor: C.border }} />
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}><text style={{ fontSize: 11, color: C.muted }}>上传</text><text style={{ fontSize: 11, color: C.orange }}>1.44 KB/s</text></div>
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}><text style={{ fontSize: 11, color: C.muted }}>下载</text><text style={{ fontSize: 11, color: C.violet }}>620 B/s</text></div>
      </div>
    </div>
    <div style={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 66, flexShrink: 0, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 14, paddingLeft: 25, paddingRight: 25, backgroundColor: C.panel, borderBottomWidth: 1, borderColor: C.border }}>
        <text style={{ fontSize: 21, fontWeight: 800, color: C.text }}>{TITLES[page]}</text><div style={{ flexGrow: 1 }} />
        <Badge tone="info">{`GPUIX native · v${appInfo.versionName}`}</Badge><PerformanceControl /><IconButton label="帮助">?</IconButton><IconButton label="更多">•••</IconButton>
      </div>
      <div key={page} style={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflowY: ownsScroll ? 'hidden' : 'scroll', flexBasis: 0, padding: 22 }}>
        <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, flexShrink: ownsScroll ? 1 : 0, minHeight: 0, minWidth: 0 }}><PageContent page={page} onNavigate={setPage} refreshRateSetting={refreshRateSetting} portraitPhone={false} /></div>
      </div>
    </div>
  </div>
}

function HomeNodeCard({ onNavigate }: { onNavigate: (page: PageId) => void }) {
  const { tokens: C } = useTheme()
  const [selectedName, setSelectedName] = useState(NODES[1].name)
  const node = NODES.find((item) => item.name === selectedName) ?? NODES[1]
  return <Card.Root style={{ flexGrow: 1 } as never}>
    <Card.Header title="当前节点" description="延迟与健康状态" icon="◎" action={<Button size="sm" variant="secondary" onClick={() => onNavigate('proxies')}>切换节点</Button>} />
    <Card.Content><Select.Root value={node.name} onValueChange={(value) => { if (typeof value === 'string') setSelectedName(value) }} items={nodeItems}><Select.Trigger testId="home-node-select"><Select.Value /><Select.Icon /></Select.Trigger><Select.Content>{NODES.map((item) => <Select.Item key={item.name} value={item.name} icon={item.region}>{item.name}</Select.Item>)}</Select.Content></Select.Root><div style={{ display: 'flex', flexDirection: 'row', gap: 8 }}><Badge tone="success">AnyTLS</Badge><Badge tone="neutral">UDP</Badge><text style={{ flexGrow: 1, textAlign: 'right', fontSize: 12, color: C.green }}>{`${node.latency} ms`}</text></div>
    </Card.Content>
  </Card.Root>
}

function HomeNetworkCard() {
  const { tokens: C } = useTheme()
  const [tun, setTun] = useState(true)
  return <Card.Root style={{ flexGrow: 1 } as never}>
    <Card.Header title="网络设置" description="代理模式与系统行为" icon="⌘" />
    <Card.Content><div style={{ display: 'flex', flexDirection: 'row', gap: 8 }}><Button width="50%" variant="secondary" icon="▣">系统代理</Button><Button width="50%" variant="primary" icon="◎">虚拟网卡模式</Button></div><div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 9, backgroundColor: tun ? `${C.green}18` : C.row, borderWidth: 1, borderColor: tun ? `${C.green}55` : C.border }}><div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}><Glyph color={C.green}>▶</Glyph><text style={{ fontSize: 13, fontWeight: 700, color: C.text }}>虚拟网卡模式</text></div><Switch checked={tun} onCheckedChange={setTun} testId="home-tun-switch" /></div>
    </Card.Content>
  </Card.Root>
}

function Home({ onNavigate, stacked }: { onNavigate: (page: PageId) => void; stacked: boolean }) {
  const { tokens: C } = useTheme()
  const appInfo = useMemo(() => readAppInfo(), [])
  const isIos = appInfo.platform === 'ios'
  const isAndroid = appInfo.platform === 'android'
  const nativeTitle = stacked ? '原生能力实验室' : isIos ? 'iOS 原生能力实验室' : isAndroid ? 'Android 原生能力实验室' : '移动端原生能力实验室'
  const nativeDesc = stacked
    ? isAndroid ? '10 项 Android 能力实测' : '跨端与原生渲染能力实测'
    : '通知、语音、中文键盘、网络、传感器与 OTA 等实测'
  const native = <Card.Root testId="home-native-demo">
    <Card.Header title={nativeTitle} description={nativeDesc} icon="✦" action={<Button size="sm" variant="primary" style={{ flexShrink: 0 }} onClick={() => onNavigate('native')}>进入实测 →</Button>} />
  </Card.Root>
  const subscription = <Card.Root testId="home-subscription" style={{ flexGrow: 1 } as never}>
    <Card.Header title="订阅状态" description="最后更新于 2 分钟前" icon="▤" action={<Button size="sm" variant="secondary" onClick={() => onNavigate('subscriptions')}>管理订阅</Button>} />
    <Card.Content><div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10 }}><Badge tone="success">已连接</Badge><text style={{ fontSize: 14, fontWeight: 700, color: C.text }}>workbench-backup.yaml</text></div><text style={{ fontSize: 12, color: C.muted }}>下次自动更新：今天 18:30 · 已使用 62.4 GB / 100 GB</text><div style={{ height: 8, borderRadius: 4, backgroundColor: C.track }}><div style={{ width: '62%', height: 8, borderRadius: 4, backgroundColor: C.violet }} /></div>
    </Card.Content>
  </Card.Root>
  const proxyMode = <Card.Root style={{ flexGrow: 1 } as never}>
    <Card.Header title="代理模式" description="流量分流策略" icon="◌" />
    <Card.Content><Tabs defaultValue="rule"><Tabs.List><Tabs.Trigger value="rule">规则</Tabs.Trigger><Tabs.Trigger value="global">全局</Tabs.Trigger><Tabs.Trigger value="direct">直连</Tabs.Trigger></Tabs.List><Tabs.Content value="rule"><div style={{ paddingTop: 12, paddingBottom: 4 }}><text style={{ fontSize: 12, color: C.muted }}>基于预设规则智能判断流量走向</text></div></Tabs.Content><Tabs.Content value="global"><div style={{ paddingTop: 12, paddingBottom: 4 }}><text style={{ fontSize: 12, color: C.muted }}>所有流量通过当前代理节点</text></div></Tabs.Content><Tabs.Content value="direct"><div style={{ paddingTop: 12, paddingBottom: 4 }}><text style={{ fontSize: 12, color: C.muted }}>所有流量绕过代理直接连接</text></div></Tabs.Content></Tabs>
    </Card.Content>
  </Card.Root>
  const traffic = <Card.Root>
    <Card.Header title="流量统计" description="最近 10 分钟" icon="◎" action={<Button size="sm" variant="ghost" onClick={() => onNavigate('connections')}>查看连接 →</Button>} />
    <Card.Content><div style={{ height: 128, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 14, borderRadius: 9, backgroundColor: C.control, borderWidth: 1, borderColor: C.border }}><div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}><text style={{ fontSize: 11, color: C.muted }}>实时吞吐</text><div style={{ display: 'flex', flexDirection: 'row', gap: 13 }}><text style={{ fontSize: 11, color: C.orange }}>↑ 1.44 KB/s</text><text style={{ fontSize: 11, color: C.violet }}>↓ 620 B/s</text></div></div><div style={{ height: 52, display: 'flex', flexDirection: 'row', alignItems: 'flex-end', gap: 5 }}>{[22, 28, 20, 36, 30, 48, 35, 44, 32, 54, 42, 58, 51, 64, 46, 70, 58, 74, 65, 78, 68, 84].map((height, index) => <div key={index} style={{ flexGrow: 1, height, borderRadius: 3, backgroundColor: index % 3 === 0 ? C.orange : C.violet, opacity: 0.75 }} />)}</div><text style={{ fontSize: 11, color: C.faint }}>1,240 个采样点</text></div><div style={{ display: 'flex', flexDirection: 'row', gap: 12, paddingTop: 2 }}><Metric label="上传速度" value="1.44" unit="KB/s" tone="warning" /><Metric label="下载速度" value="620" unit="B/s" tone="info" /><Metric label="活跃连接" value="70" unit="条" tone="success" /></div>
    </Card.Content>
  </Card.Root>

  if (stacked) return <virtual-list
    estimatedItemHeight={170}
    overdraw={100}
    style={{ flexGrow: 1, minHeight: 0, width: '100%' }}
  >
    <div key="native" style={{ paddingBottom: 16 }}>{native}</div>
    <div key="subscription" style={{ paddingBottom: 16 }}>{subscription}</div>
    <div key="node" style={{ paddingBottom: 16 }}><HomeNodeCard onNavigate={onNavigate} /></div>
    <div key="network" style={{ paddingBottom: 16 }}><HomeNetworkCard /></div>
    <div key="mode" style={{ paddingBottom: 16 }}>{proxyMode}</div>
    <div key="traffic">{traffic}</div>
  </virtual-list>

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    {native}
    <div style={{ display: 'flex', flexDirection: 'row', gap: 16 }}>
      {subscription}
      <HomeNodeCard onNavigate={onNavigate} />
    </div>
    <div style={{ display: 'flex', flexDirection: 'row', gap: 16 }}>
      <HomeNetworkCard />
      {proxyMode}
    </div>
    {traffic}
  </div>
}

function Metric({ label, value, unit, tone, dense = false }: { label: string; value: string; unit: string; tone: 'warning' | 'info' | 'success'; dense?: boolean }) {
  const { tokens: C } = useTheme()
  const color = tone === 'warning' ? C.orange : tone === 'info' ? C.violet : C.green
  return <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: dense ? 1 : 5, padding: dense ? 5 : 14, borderRadius: 9, backgroundColor: C.panelRaised, borderWidth: 1, borderColor: C.border }}><text style={{ fontSize: dense ? 8 : 11, whiteSpace: 'nowrap', color: C.muted }}>{label}</text><div style={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', gap: dense ? 2 : 5 }}><text style={{ fontSize: dense ? 15 : 21, fontWeight: 800, color: C.text }}>{value}</text><text style={{ fontSize: dense ? 8 : 11, color }}>{unit}</text></div></div>
}

const ProxyRow = memo(function ProxyRow({ node, selected, onSelect, mobile = false }: { node: typeof PROXY_ROWS[number]; selected: boolean; onSelect: (id: string) => void; mobile?: boolean }) {
  const { tokens: C } = useTheme()
  const color = node.latency < 150 ? C.green : node.latency < 260 ? C.violet : C.orange
  if (mobile) return <List.Item testId={`proxy-${node.id}`} selected={selected} onClick={() => onSelect(node.id)} style={{ height: 104, minHeight: 104, maxHeight: 104, flexDirection: 'column', alignItems: 'stretch', gap: 4, paddingTop: 8, paddingBottom: 8 }}>
    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 }}>
      <List.ItemLeading tone={node.latency < 150 ? 'success' : 'info'}>{node.region}</List.ItemLeading>
      <List.ItemContent><List.ItemTitle>{node.name}</List.ItemTitle><List.ItemDescription>{node.protocol} · UDP</List.ItemDescription></List.ItemContent>
      <Button testId={`choose-${node.id}`} width={66} size="sm" variant={selected ? 'primary' : 'secondary'} style={{ flexShrink: 0, height: 42, paddingLeft: 4, paddingRight: 4 }} onClick={() => onSelect(node.id)}>{selected ? '已选择' : '选择'}</Button>
    </div>
    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
      <List.ItemMeta><text style={{ width: 92, fontSize: 14, fontWeight: 700, textAlign: 'center', whiteSpace: 'nowrap', color }}>{`${node.latency} ms`}</text><Badge width={62} tone={selected ? 'info' : 'neutral'}>{selected ? '当前节点' : '可用'}</Badge></List.ItemMeta>
    </div>
  </List.Item>
  return <List.Item testId={`proxy-${node.id}`} selected={selected} onClick={() => onSelect(node.id)}>
    <List.ItemLeading tone={node.latency < 150 ? 'success' : node.latency < 260 ? 'info' : 'warning'}>{node.region}</List.ItemLeading>
    <List.ItemContent><List.ItemTitle>{node.name}</List.ItemTitle><List.ItemDescription>{node.protocol} · UDP · {node.location} · TLS ready</List.ItemDescription></List.ItemContent>
    <List.ItemMeta><div style={{ width: 92, display: 'flex', flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 2 }}><text style={{ fontSize: 14, fontWeight: 800, color, whiteSpace: 'nowrap' }}>{node.latency}</text><text style={{ fontSize: 11, color, whiteSpace: 'nowrap' }}>ms</text></div><Badge width={62} tone={selected ? 'info' : 'neutral'}>{selected ? '当前节点' : '可用'}</Badge></List.ItemMeta>
    <List.ItemActions><Button width={58} size="sm" variant={selected ? 'primary' : 'secondary'} onClick={() => onSelect(node.id)}>{selected ? '已选择' : '选择'}</Button><Button width={34} size="sm" variant="ghost">•••</Button></List.ItemActions>
  </List.Item>
})

const PROXY_WINDOW_SIZE = 48

function Proxies({ mobile }: { mobile: boolean }) {
  // Portrait phones use the two-line touch row. Landscape phones have enough
  // width for the fixed desktop columns, which keeps latency/status/actions
  // aligned vertically while still honoring the compact shell insets.
  const [selected, setSelected] = useState(PROXY_ROWS[1].id)
  const [query, setQuery] = useState('')
  const [windowRange, setWindowRange] = useState({ start: 0, end: PROXY_WINDOW_SIZE })
  const filteredRows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return needle ? PROXY_ROWS.filter((row) => row.name.toLowerCase().includes(needle) || row.protocol.toLowerCase().includes(needle)) : PROXY_ROWS
  }, [query])
  const selectNode = useCallback((id: string) => setSelected(id), [])
  const renderProxyRow = useCallback(
    (node: typeof PROXY_ROWS[number]) => <ProxyRow mobile={mobile} node={node} selected={selected === node.id} onSelect={selectNode} />,
    [mobile, selected, selectNode],
  )
  return <List.Root style={{ height: '100%' }}>
    <List.Header title="GPUIX · 代理节点" description={mobile ? "选择当前使用的节点" : "GPUIX virtual-list · 只挂载当前窗口，滚动时由原生列表接管"} count={`${filteredRows.length.toLocaleString()} 个节点`} action={mobile ? undefined : <><Badge tone="success">96 在线</Badge><Button size="sm" variant="secondary">批量测速</Button></>} />
    <List.Toolbar><div style={{ width: mobile ? undefined : 240, flexGrow: mobile ? 1 : undefined, minWidth: 0 }}><Input value={query} placeholder="搜索节点或协议" onChange={setQuery} testId="proxy-search" /></div><Badge width={88} tone="info">窗口 {filteredRows.length === 0 ? 0 : windowRange.start + 1}–{windowRange.end}</Badge>{!mobile && <text style={{ fontSize: 11, color: '#A1A1AA', whiteSpace: 'nowrap' }}>{PROXY_WINDOW_SIZE} 行窗口 · 原生滚轮惯性</text>}{!mobile && <><div style={{ flexGrow: 1 }} /><Button size="sm" variant="ghost">规则</Button></>}</List.Toolbar>
    <List.Virtual
      data={filteredRows}
      estimatedItemHeight={mobile ? 104 : 68}
      overdraw={240}
      windowSize={PROXY_WINDOW_SIZE}
      safetyBuffer={10}
      windowStep={12}
      keyExtractor={(node) => node.id}
      renderItem={renderProxyRow}
      onWindowChange={setWindowRange}
      empty={<List.Empty title="没有匹配的节点" description="换一个关键词再试试" />}
    />
  </List.Root>
}

function Subscriptions({ stacked = false }: { stacked?: boolean }) {
  const { tokens: C } = useTheme()
  const [profile, setProfile] = useState('workbench-backup.yaml')
  const profiles = [{ value: 'workbench-backup.yaml', label: 'workbench-backup.yaml' }, { value: 'personal.yaml', label: 'personal.yaml' }]
  const manageCard = <Card.Root>
    <Card.Header title="订阅管理" description="管理远程配置与更新策略" icon="▤" action={<Button size={stacked ? 'sm' : 'md'} variant="primary">添加订阅</Button>} />
    <Card.Content>
      <div style={{ display: 'flex', flexDirection: 'row', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', minWidth: 0 }}>
        <div style={{ flexGrow: 1, flexBasis: 160, minWidth: 0 }}>
          <Select.Root value={profile} onValueChange={(value) => setProfile(value as string)} items={profiles}>
            <Select.Trigger><Select.Value /><Select.Icon /></Select.Trigger>
            <Select.Content>{profiles.map((item) => <Select.Item key={item.value} value={item.value}>{item.label}</Select.Item>)}</Select.Content>
          </Select.Root>
        </div>
        <Button variant="secondary" style={{ flexShrink: 0 }}>立即更新</Button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 9, paddingTop: 4 }}>
        <Badge tone="success">更新成功</Badge>
        <text style={{ fontSize: 12, color: C.muted }}>2026-09-17 12:32 · 下次更新 6 小时后</text>
      </div>
    </Card.Content>
  </Card.Root>

  const addCard = <Card.Root>
    <Card.Header title="新增订阅" description="组件化表单示例" icon="＋" />
    <Card.Content>
      <Input label="订阅地址" placeholder="https://example.com/profile.yaml" />
      <div style={{ display: 'flex', flexDirection: stacked ? 'column' : 'row', gap: stacked ? 10 : 12, minWidth: 0 }}>
        <div style={{ flexGrow: stacked ? undefined : 1, width: stacked ? '100%' : undefined, minWidth: 0 }}>
          <Input label="备注" placeholder="工作代理" />
        </div>
        <div style={{ width: stacked ? '100%' : 160, flexShrink: 0, minWidth: 0 }}>
          <Select.Root defaultValue="每日" items={[{ value: '每日', label: '每日' }, { value: '每周', label: '每周' }, { value: '手动', label: '手动' }]}>
            <Select.Trigger><Select.Value /><Select.Icon /></Select.Trigger>
            <Select.Content>
              <Select.Item value="每日">每日</Select.Item>
              <Select.Item value="每周">每周</Select.Item>
              <Select.Item value="手动">手动</Select.Item>
            </Select.Content>
          </Select.Root>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
        <Button variant="ghost">取消</Button>
        <Button variant="primary">保存订阅</Button>
      </div>
    </Card.Content>
  </Card.Root>

  if (stacked) {
    return <virtual-list estimatedItemHeight={240} overdraw={160} style={{ flexGrow: 1, minHeight: 0, width: '100%' }}>
      <div key="sub-manage" style={{ width: '100%', paddingBottom: 14 }}>{manageCard}</div>
      <div key="sub-add" style={{ width: '100%', paddingBottom: 16 }}>{addCard}</div>
    </virtual-list>
  }

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{manageCard}{addCard}</div>
}

function Connections({ stacked = false }: { stacked?: boolean }) {
  const { tokens: C } = useTheme()
  const connections = [
    { process: 'Cursor', host: 'api.openai.com', rule: 'AI', type: 'TCP' },
    { process: 'Safari', host: 'github.com', rule: 'Proxy', type: 'TCP' },
    { process: 'Arc', host: 'fonts.gstatic.com', rule: 'Proxy', type: 'TLS' },
    { process: 'Telegram', host: '149.154.167.51', rule: 'Global', type: 'TCP' },
    { process: 'System', host: 'time.apple.com', rule: 'DIRECT', type: 'UDP' },
  ]
  const renderConnectionRow = (item: typeof connections[number]) => (
    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: stacked ? 8 : 12, padding: stacked ? 10 : 12, borderRadius: 8, backgroundColor: C.row, borderWidth: 1, borderColor: C.border, minWidth: 0 }}>
      <div style={{ width: 32, height: 32, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: C.iconBg }}>
        <Glyph color={C.violet}>{item.process.slice(0, 1)}</Glyph>
      </div>
      <div style={{ flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <text style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{item.process}</text>
        <text style={{ fontSize: 11, color: C.muted }}>{item.host}</text>
      </div>
      <Badge tone={item.rule === 'DIRECT' ? 'neutral' : 'info'}>{item.rule}</Badge>
      {!stacked && <Badge>{item.type}</Badge>}
      <text style={{ width: stacked ? 46 : 58, flexShrink: 0, fontSize: 12, color: C.green, textAlign: 'right', whiteSpace: 'nowrap' }}>已连接</text>
    </div>
  )

  if (stacked) {
    return <virtual-list estimatedItemHeight={84} overdraw={160} style={{ flexGrow: 1, minHeight: 0, width: '100%' }}>
      <div key="conn-header" style={{ width: '100%', paddingBottom: 10 }}>
        <Card.Root>
          <Card.Header title="活动连接" description="实时网络连接 · 5 个活动" icon="◎" />
          <Card.Content gap={10}>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <div style={{ flexGrow: 1, flexBasis: 0, minWidth: 0 }}>
                <Input placeholder="搜索进程或域名" />
              </div>
              <Button size="sm" variant="secondary" style={{ flexShrink: 0 }}>清理全部</Button>
            </div>
          </Card.Content>
        </Card.Root>
      </div>
      {connections.map((item, idx) => (
        <div key={item.host} style={{ width: '100%', paddingBottom: idx === connections.length - 1 ? 16 : 8 }}>
          {renderConnectionRow(item)}
        </div>
      ))}
    </virtual-list>
  }

  return <Card.Root>
    <Card.Header
      title="活动连接"
      description="实时网络连接 · 5 个活动"
      icon="◎"
      action={
        <div style={{ display: 'flex', flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <div style={{ width: 200 }}><Input placeholder="搜索进程或域名" /></div>
          <Button variant="secondary">清理全部</Button>
        </div>
      }
    />
    <Card.Content gap={7}>
      {connections.map((item) => <div key={item.host}>{renderConnectionRow(item)}</div>)}
    </Card.Content>
  </Card.Root>
}

type RefreshRateRenderer = NativeRenderer & {
  setPowerFrameRate?: (frameRate: number) => void
  getSupportedRefreshRates?: () => number[]
  getInteractionFrameRateCap?: () => number
}

const DEFAULT_INTERACTION_REFRESH_RATE = '120'
const COMMON_REFRESH_RATES = [20, 30, 40, 50, 60, 90, 120, 144, 165]

type RefreshRatePreference = { enabled: boolean; rate: string }
const DEFAULT_REFRESH_RATE_PREFERENCE: RefreshRatePreference = { enabled: true, rate: DEFAULT_INTERACTION_REFRESH_RATE }
type RefreshRateSettingProps = {
  initialValue: RefreshRatePreference
  onChange: (value: RefreshRatePreference) => void
}

function RefreshRateSetting({ initialValue, onChange }: RefreshRateSettingProps) {
  const { tokens: C } = useTheme()
  const { renderer } = useGpuix()
  const nativeRenderer = renderer as RefreshRateRenderer | null
  const [{ enabled, rate }, setPreference] = useState(initialValue)
  const [display, setDisplay] = useState<{ rates: number[]; cap: number | null } | null>(null)
  const hardwareMax = display ? Math.max(...display.rates) : Number.POSITIVE_INFINITY
  const options = useMemo(() => COMMON_REFRESH_RATES.map((value) => ({
    value: String(value),
    label: `${value} Hz`,
    // System policy can temporarily clamp a supported user preference.
    disabled: value > hardwareMax + 0.5,
  })), [hardwareMax])
  useEffect(() => {
    try {
      const rates = nativeRenderer?.getSupportedRefreshRates?.() ?? []
      if (rates.length === 0) return
      const cap = nativeRenderer?.getInteractionFrameRateCap?.()
      setDisplay({ rates, cap: typeof cap === 'number' && Number.isFinite(cap) && cap > 1 ? cap : null })
    } catch {
      // Older bindings can leave display capabilities unavailable.
    }
  }, [nativeRenderer])
  const apply = useCallback((next: RefreshRatePreference) => {
    if (Reflect.get(globalThis, '__gpuixAndroid')) {
      nativeRenderer?.setPowerFrameRate?.(Number(next.enabled ? next.rate : DEFAULT_INTERACTION_REFRESH_RATE))
    }
    setPreference(next)
    onChange(next)
  }, [nativeRenderer, onChange])
  const onEnabledChange = useCallback((next: boolean) => {
    apply({ enabled: next, rate })
  }, [apply, rate])
  const onRateChange = useCallback((next: string | string[] | null) => {
    const value = Array.isArray(next) ? next[0] : next
    if (!value) return
    apply({ enabled, rate: value })
  }, [apply, enabled])
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 9, width: '100%' }}>
    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <text style={{ fontSize: 13, fontWeight: 700 }}>交互刷新率上限</text>
        <text style={{ fontSize: 11, color: C.muted }}>滚动/动画时使用；页面静止自动省电</text>
      </div>
      <Switch checked={enabled} onCheckedChange={onEnabledChange} ariaLabel="使用自定义交互刷新率上限" />
    </div>
    <Select.Root value={enabled ? rate : DEFAULT_INTERACTION_REFRESH_RATE} disabled={!enabled} onValueChange={onRateChange} items={options}>
      <Select.Trigger ariaLabel="交互刷新率上限"><Select.Value /><Select.Icon /></Select.Trigger>
      <Select.Content>{options.map((item) => <Select.Item key={item.value} value={item.value} disabled={item.disabled}>{item.label}</Select.Item>)}</Select.Content>
    </Select.Root>
    {display !== null && <div style={{ display: 'flex', flexDirection: 'row', gap: 7, flexWrap: 'wrap' }}><Badge tone="neutral">硬件 {display.rates.map((value) => Math.round(value)).join(' / ')} Hz</Badge><Badge tone="info">系统上限 {display.cap ? `${Math.round(display.cap)} Hz` : '读取中'}</Badge></div>}
    <text style={{ fontSize: 10, color: C.muted }}>低电量时系统会自动降档，无需手动改回低值</text>
  </div>
}

const LOG_LEVEL_ITEMS = ['Info', 'Debug', 'Warn'].map((value) => ({ value, label: value }))
const LANGUAGE_ITEMS = ['中文', 'English'].map((value) => ({ value, label: value }))

function SystemSettingsCard() {
  return <Card.Root>
    <Card.Header title="系统设置" description="运行方式与系统集成" icon="⌘" />
    <Card.Content>
      <SettingRow title="虚拟网卡模式" description="应用将通过虚拟网卡访问网络" checked />
      <SettingRow title="系统代理" description="将代理写入系统网络设置" />
      <SettingRow title="开机自启" description="登录后自动启动 GPUIX" />
    </Card.Content>
  </Card.Root>
}

function ClashSettingsCard() {
  return <Card.Root>
    <Card.Header title="Clash 设置" description="内核和连接参数" icon="◎" />
    <Card.Content>
      <SettingRow title="统一延迟" description="使用统一延迟测试策略" checked />
      <SettingRow title="IPv6" description="允许 IPv6 出站连接" />
      <div style={{ display: 'flex', flexDirection: 'row', gap: 12 }}>
        <div style={{ flexGrow: 1, minWidth: 0 }}><Input label="端口设置" value="7890" /></div>
        <div style={{ flexGrow: 1, minWidth: 0 }}>
          <Select.Root defaultValue="Info" items={LOG_LEVEL_ITEMS}>
            <Select.Trigger><Select.Value /><Select.Icon /></Select.Trigger>
            <Select.Content>{LOG_LEVEL_ITEMS.map(({ value }) => <Select.Item key={value} value={value}>{value}</Select.Item>)}</Select.Content>
          </Select.Root>
        </div>
      </div>
    </Card.Content>
  </Card.Root>
}

function InterfaceSettingsCard() {
  const { tokens: C, mode, setMode } = useTheme()
  return <Card.Root>
    <Card.Header title="界面设置" description="主题、语言与交互" icon="✦" />
    <Card.Content>
      <Select.Root defaultValue="中文" items={LANGUAGE_ITEMS}>
        <Select.Trigger><Select.Value /><Select.Icon /></Select.Trigger>
        <Select.Content>{LANGUAGE_ITEMS.map(({ value }) => <Select.Item key={value} value={value}>{value}</Select.Item>)}</Select.Content>
      </Select.Root>
      <text style={{ paddingTop: 7, fontSize: 12, fontWeight: 700, color: C.muted }}>主题模式</text>
      <Tabs value={mode} onValueChange={(next) => setMode(next as ThemeMode)}>
        <Tabs.List>
          <Tabs.Trigger value="light">浅色</Tabs.Trigger>
          <Tabs.Trigger value="dark">深色</Tabs.Trigger>
          <Tabs.Trigger value="system">系统</Tabs.Trigger>
        </Tabs.List>
      </Tabs>
      <div style={{ height: 1, marginTop: 7, marginBottom: 4, backgroundColor: C.border }} />
      <SettingRow title="托盘点击事件" description="点击托盘显示主窗口" checked />
      <SettingRow title="显示动画" description="启用界面过渡效果" checked />
    </Card.Content>
  </Card.Root>
}

function Settings({ refreshRateSetting, stacked }: {
  refreshRateSetting: RefreshRateSettingProps
  stacked: boolean
}) {
  const { tokens: C } = useTheme()
  const appInfo = useMemo(() => readAppInfo(), [])
  const performanceCard = <Card.Root>
    <Card.Header title="性能与省电" description="待机与高刷策略" icon="◌" />
    <Card.Content><RefreshRateSetting {...refreshRateSetting} /></Card.Content>
  </Card.Root>
  const versionRows: [string, string][] = [
    ['版本', `v${appInfo.versionName} (${appInfo.versionCode})`],
    ['运行平台', appInfo.platform],
    ['应用标识', appInfo.appId],
    ['构建哈希', appInfo.buildHash],
    ['发布通道', `${appInfo.channel} · runtime ${appInfo.runtimeVersion}`],
  ]
  const versionCard = <Card.Root testId="settings-version-card">
    <Card.Header title="版本与构建信息" description="运行时与分发标识" icon="◈" />
    <Card.Content>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {versionRows.map(([label, value]) => (
          <div key={label} style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingTop: 2, paddingBottom: 2 }}>
            <text style={{ fontSize: 12, color: C.muted }}>{label}</text>
            <text style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{value}</text>
          </div>
        ))}
      </div>
    </Card.Content>
  </Card.Root>
  if (stacked) return <virtual-list
    estimatedItemHeight={240}
    overdraw={120}
    style={{ flexGrow: 1, minHeight: 0, width: '100%' }}
  >
    <div key="version" style={{ paddingBottom: 16 }}>{versionCard}</div>
    <div key="performance" style={{ paddingBottom: 16 }}>{performanceCard}</div>
    <div key="system" style={{ paddingBottom: 14 }}><SystemSettingsCard /></div>
    <div key="clash" style={{ paddingBottom: 16 }}><ClashSettingsCard /></div>
    <div key="interface"><InterfaceSettingsCard /></div>
  </virtual-list>

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'stretch' }}>
    {versionCard}
    {performanceCard}
    <div style={{ display: 'flex', flexDirection: 'row', gap: 16, alignItems: 'stretch' }}>
      <div style={{ width: '50%', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <SystemSettingsCard />
        <ClashSettingsCard />
      </div>
      <div style={{ width: '50%', minWidth: 0 }}><InterfaceSettingsCard /></div>
    </div>
  </div>
}

function SettingRow({ title, description, checked = false }: { title: string; description: string; checked?: boolean }) {
  const { tokens: C } = useTheme()
  return <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 5, paddingBottom: 5 }}><div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 3 }}><text style={{ fontSize: 13, fontWeight: 700 }}>{title}</text><text style={{ fontSize: 11, color: C.muted }}>{description}</text></div><Switch defaultChecked={checked} /></div>
}

function Placeholder({ page }: { page: PageId }) {
  const { tokens: C } = useTheme()
  return <Card.Root><Card.Header title={TITLES[page]} description="同一套组件可以继续组合出更多业务页面" icon="◇" /><Card.Content><div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, paddingTop: 60, paddingBottom: 60 }}><div style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: C.iconBg }}><Glyph color={C.violet} size={24}>✦</Glyph></div><text style={{ fontSize: 15, fontWeight: 700, color: C.text }}>页面骨架已就绪</text><text style={{ fontSize: 12, color: C.muted }}>可以直接复用 Card、Tabs、Select、Switch 和主题 token。</text></div></Card.Content></Card.Root>
}

render(<ThemeProvider initialMode="dark"><Shell /></ThemeProvider>, isMobileHost()
  ? { title: 'GPUIX Base UI' }
  : { title: 'gpuix-base-ui', width: 1280, height: 860, minWidth: 1024, minHeight: 768, resizable: true })

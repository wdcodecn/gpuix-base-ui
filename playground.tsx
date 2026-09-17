import { memo, useCallback, useMemo, useRef, useState } from 'react'
import { render, useWindowInsets, useWindowSize } from '@gpuix/react'
import { Badge, Button, Card, Glyph, IconButton, Input, List, Select, Switch, Tabs, ThemeProvider, useTheme, type ThemeMode } from './src'
import { Gallery } from './gallery'

type PageId = 'home' | 'proxies' | 'subscriptions' | 'connections' | 'rules' | 'logs' | 'tests' | 'components' | 'settings'

const NAV: { id: PageId; label: string; icon: string }[] = [
  { id: 'home', label: '首页', icon: '⌂' },
  { id: 'proxies', label: '代理', icon: '⌁' },
  { id: 'subscriptions', label: '订阅', icon: '▤' },
  { id: 'connections', label: '连接', icon: '◎' },
  { id: 'rules', label: '规则', icon: '⌘' },
  { id: 'logs', label: '日志', icon: '☷' },
  { id: 'tests', label: '测试', icon: '♙' },
  { id: 'components', label: '组件', icon: '◇' },
  { id: 'settings', label: '设置', icon: '⚙' },
]

const TITLES: Record<PageId, string> = {
  home: '首页', proxies: '代理组', subscriptions: '订阅管理', connections: '活动连接', rules: '规则配置', logs: '运行日志', tests: '网络测试', components: '组件工作台', settings: '设置',
}

const NODES = [
  { name: '高级 | 新加坡 01', flag: '🇸🇬', latency: 92 }, { name: '高级 | 新加坡 02', flag: '🇸🇬', latency: 117 },
  { name: '高级 | 香港 01', flag: '🇭🇰', latency: 58 }, { name: '高级 | 香港 02', flag: '🇭🇰', latency: 102 },
  { name: '高级 | 日本 01', flag: '🇯🇵', latency: 79 }, { name: '高级 | 日本 02', flag: '🇯🇵', latency: 89 },
  { name: '高级 | 美国 01', flag: '🇺🇸', latency: 253 }, { name: '高级 | 台湾 01', flag: '🇹🇼', latency: 310 },
  { name: '高级 | 德国 01', flag: '🇩🇪', latency: 238 },
]

const nodeItems = NODES.map((node) => ({ value: node.name, label: node.name }))

const PROXY_ROWS = Array.from({ length: 5000 }, (_, index) => {
  const base = NODES[index % NODES.length]
  const jitter = (index * 17) % 53
  return { id: `${base.name}-${index}`, name: `${base.name} · #${String(index + 1).padStart(4, '0')}`, flag: base.flag, latency: base.latency + jitter, protocol: index % 4 === 0 ? 'Hysteria2' : 'AnyTLS', location: base.name.split(' | ')[1] }
})

function NavItem({ active, label, icon, onClick }: { active: boolean; label: string; icon: string; onClick: () => void }) {
  return <Button testId={`nav-${label}`} width="100%" justify="start" variant={active ? 'primary' : 'ghost'} onClick={onClick} icon={icon}>{label}</Button>
}

function PageContent({ page, onNavigate }: { page: PageId; onNavigate: (page: PageId) => void }) {
  const { mode, setMode } = useTheme()
  if (page === 'home') return <Home onNavigate={onNavigate} />
  if (page === 'proxies') return <Proxies />
  if (page === 'subscriptions') return <Subscriptions />
  if (page === 'connections') return <Connections />
  if (page === 'components') return <Gallery />
  if (page === 'settings') return <Settings mode={mode} setMode={setMode} />
  return <Placeholder page={page} />
}

function Shell() {
  const [page, setPage] = useState<PageId>('home')
  const { tokens: C, mode, setMode } = useTheme()
  const { width } = useWindowSize()
  const insets = useWindowInsets()
  const compact = width < 1180
  if (width < 760) return <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', paddingTop: insets.effective.top, paddingBottom: insets.effective.bottom, backgroundColor: C.canvas, color: C.text, fontFamily: 'sans-serif' }}>
    <div style={{ height: 56, flexShrink: 0, display: 'flex', flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 16, gap: 10, backgroundColor: C.panel }}>
      <text style={{ flexGrow: 1, fontSize: 20, fontWeight: 800, color: C.text }}>{TITLES[page]}</text>
      <Badge tone="info">GPUIX</Badge>
      <Button testId="mobile-theme" size="sm" variant="secondary" style={{ height: 42 }} onClick={() => setMode(mode === 'light' ? 'dark' : 'light')}>{mode === 'light' ? '深色' : '浅色'}</Button>
    </div>
    <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', padding: 8, gap: 4, backgroundColor: C.panel, borderBottomWidth: 1, borderColor: C.border }}>
      {[NAV.slice(0, 4), NAV.slice(4)].map((items, row) => <div key={row} style={{ display: 'flex', flexDirection: 'row', gap: 4 }}>{items.map((item) => <Button key={item.id} testId={`nav-${item.label}`} variant={page === item.id ? 'primary' : 'ghost'} style={{ flexGrow: 1, flexBasis: 0, minWidth: 0, height: 42, paddingLeft: 4, paddingRight: 4 }} onClick={() => setPage(item.id)}>{item.label}</Button>)}</div>)}
    </div>
    <div style={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflowY: page === 'proxies' ? 'hidden' : 'scroll', flexBasis: 0, padding: 10 }}>
      <PageContent page={page} onNavigate={setPage} />
    </div>
  </div>
  return <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'row', backgroundColor: C.canvas, color: C.text, fontFamily: 'Helvetica' }}>
    <div style={{ width: compact ? 190 : 214, flexShrink: 0, display: 'flex', flexDirection: 'column', padding: compact ? 12 : 16, backgroundColor: C.sidebar, borderRightWidth: 1, borderColor: C.border }}>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 11, paddingLeft: 8, paddingRight: 8, paddingTop: 8, paddingBottom: 24 }}>
        <div style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: C.primary }}><Glyph color={C.primaryForeground} size={21}>◈</Glyph></div>
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
        <Badge tone="info">GPUIX native</Badge><IconButton label="帮助">?</IconButton><IconButton label="更多">•••</IconButton>
      </div>
      <div style={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflowY: 'scroll', flexBasis: 0, padding: 22 }}>
        <PageContent page={page} onNavigate={setPage} />
      </div>
    </div>
  </div>
}

function Home({ onNavigate }: { onNavigate: (page: PageId) => void }) {
  const { tokens: C } = useTheme()
  const mobile = useWindowSize().width < 760
  const [node, setNode] = useState(NODES[1].name)
  const [tun, setTun] = useState(true)
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    <div style={{ display: 'flex', flexDirection: mobile ? 'column' : 'row', gap: 16 }}>
      <Card.Root testId="home-subscription" style={{ flexGrow: 1 } as never}><Card.Header title="订阅状态" description="最后更新于 2 分钟前" icon="↻" action={<Button size="sm" variant="secondary" onClick={() => onNavigate('subscriptions')}>管理订阅</Button>} /><Card.Content><div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10 }}><Badge tone="success">已连接</Badge><text style={{ fontSize: 14, fontWeight: 700, color: C.text }}>workbench-backup.yaml</text></div><text style={{ fontSize: 12, color: C.muted }}>下次自动更新：今天 18:30 · 已使用 62.4 GB / 100 GB</text><div style={{ height: 8, borderRadius: 4, backgroundColor: C.track }}><div style={{ width: '62%', height: 8, borderRadius: 4, backgroundColor: C.violet }} /></div></Card.Content></Card.Root>
      <Card.Root style={{ flexGrow: 1 } as never}><Card.Header title="当前节点" description="延迟与健康状态" icon="⌁" action={<Button size="sm" variant="secondary" onClick={() => onNavigate('proxies')}>切换节点</Button>} /><Card.Content><Select.Root value={node} onValueChange={(value) => setNode(value as string)} items={nodeItems}><Select.Trigger testId="home-node-select"><Select.Value /><Select.Icon /></Select.Trigger><Select.Content>{NODES.map((item) => <Select.Item key={item.name} value={item.name} icon={item.flag}>{item.name}</Select.Item>)}</Select.Content></Select.Root><div style={{ display: 'flex', flexDirection: 'row', gap: 8 }}><Badge tone="success">AnyTLS</Badge><Badge tone="neutral">UDP</Badge><text style={{ flexGrow: 1, textAlign: 'right', fontSize: 12, color: C.green }}>117 ms</text></div></Card.Content></Card.Root>
    </div>
    <div style={{ display: 'flex', flexDirection: mobile ? 'column' : 'row', gap: 16 }}>
      <Card.Root style={{ flexGrow: 1 } as never}><Card.Header title="网络设置" description="代理模式与系统行为" icon="⌘" /><Card.Content><div style={{ display: 'flex', flexDirection: 'row', gap: 8 }}><Button width="50%" variant="secondary" icon="▣">系统代理</Button><Button width="50%" variant="primary" icon="⌁">虚拟网卡模式</Button></div><div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 9, backgroundColor: tun ? `${C.green}18` : C.row, borderWidth: 1, borderColor: tun ? `${C.green}55` : C.border }}><div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}><Glyph color={C.green}>▶</Glyph><text style={{ fontSize: 13, fontWeight: 700, color: C.text }}>虚拟网卡模式</text></div><Switch checked={tun} onCheckedChange={setTun} testId="home-tun-switch" /></div></Card.Content></Card.Root>
      <Card.Root style={{ flexGrow: 1 } as never}><Card.Header title="代理模式" description="流量分流策略" icon="◌" /><Card.Content><Tabs defaultValue="rule"><Tabs.List><Tabs.Trigger value="rule">规则</Tabs.Trigger><Tabs.Trigger value="global">全局</Tabs.Trigger><Tabs.Trigger value="direct">直连</Tabs.Trigger></Tabs.List><Tabs.Content value="rule"><div style={{ paddingTop: 12, paddingBottom: 4 }}><text style={{ fontSize: 12, color: C.muted }}>基于预设规则智能判断流量走向</text></div></Tabs.Content><Tabs.Content value="global"><div style={{ paddingTop: 12, paddingBottom: 4 }}><text style={{ fontSize: 12, color: C.muted }}>所有流量通过当前代理节点</text></div></Tabs.Content><Tabs.Content value="direct"><div style={{ paddingTop: 12, paddingBottom: 4 }}><text style={{ fontSize: 12, color: C.muted }}>所有流量绕过代理直接连接</text></div></Tabs.Content></Tabs></Card.Content></Card.Root>
    </div>
    <Card.Root><Card.Header title="流量统计" description="最近 10 分钟" icon="◒" action={<Button size="sm" variant="ghost" onClick={() => onNavigate('connections')}>查看连接 →</Button>} /><Card.Content><div style={{ height: 128, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 14, borderRadius: 9, backgroundColor: C.control, borderWidth: 1, borderColor: C.border }}><div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}><text style={{ fontSize: 11, color: C.muted }}>实时吞吐</text><div style={{ display: 'flex', flexDirection: 'row', gap: 13 }}><text style={{ fontSize: 11, color: C.orange }}>↑ 1.44 KB/s</text><text style={{ fontSize: 11, color: C.violet }}>↓ 620 B/s</text></div></div><div style={{ height: 52, display: 'flex', flexDirection: 'row', alignItems: 'flex-end', gap: 5 }}>{[22, 28, 20, 36, 30, 48, 35, 44, 32, 54, 42, 58, 51, 64, 46, 70, 58, 74, 65, 78, 68, 84].map((height, index) => <div key={index} style={{ flexGrow: 1, height, borderRadius: 3, backgroundColor: index % 3 === 0 ? C.orange : C.violet, opacity: 0.75 }} />)}</div><text style={{ fontSize: 11, color: C.faint }}>Points: 1,240 · Compressed: 0 · FPS: 60</text></div><div style={{ display: 'flex', flexDirection: 'row', gap: 12, paddingTop: 2 }}><Metric label="上传速度" value="1.44" unit="KB/s" tone="warning" /><Metric label="下载速度" value="620" unit="B/s" tone="info" /><Metric label="活跃连接" value="70" unit="条" tone="success" /></div></Card.Content></Card.Root>
  </div>
}

function Metric({ label, value, unit, tone }: { label: string; value: string; unit: string; tone: 'warning' | 'info' | 'success' }) {
  const { tokens: C } = useTheme()
  const color = tone === 'warning' ? C.orange : tone === 'info' ? C.violet : C.green
  return <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 5, padding: 14, borderRadius: 9, backgroundColor: C.panelRaised, borderWidth: 1, borderColor: C.border }}><text style={{ fontSize: 11, color: C.muted }}>{label}</text><div style={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', gap: 5 }}><text style={{ fontSize: 21, fontWeight: 800, color: C.text }}>{value}</text><text style={{ fontSize: 11, color }}>{unit}</text></div></div>
}

function ProxiesLegacy() {
  const { tokens: C } = useTheme()
  const [selected, setSelected] = useState(PROXY_ROWS[1].id)
  const [query, setQuery] = useState('')
  const [windowStart, setWindowStart] = useState(0)
  const filteredRows = query ? PROXY_ROWS.filter((row) => row.name.toLowerCase().includes(query.toLowerCase()) || row.protocol.toLowerCase().includes(query.toLowerCase())) : PROXY_ROWS
  const windowSize = 100
  const maxStart = Math.max(0, filteredRows.length - windowSize)
  const end = Math.min(filteredRows.length, windowStart + windowSize)
  const onVisibleRange = (event: { startIndex?: number }) => {
    const next = Math.max(0, Math.min(maxStart, Math.floor((event.startIndex ?? 0) - 25)))
    if (next !== windowStart) setWindowStart(next)
  }
  return <List.Root style={{ height: '100%' }}><List.Header title="GPUIX · 代理节点" description="GPUIX virtual-list · 只挂载当前窗口，滚动时由原生列表接管" count={`${filteredRows.length.toLocaleString()} 个节点`} action={<div style={{ display: 'flex', flexDirection: 'row', gap: 7 }}><Badge tone="success">96 在线</Badge><Button size="sm" variant="secondary">批量测速</Button></div>} /><List.Toolbar><div style={{ width: 260 }}><Input value={query} placeholder="搜索节点或协议" onChange={(value) => { setQuery(value); setWindowStart(0) }} testId="proxy-search" /></div><Badge tone="info">窗口 {filteredRows.length === 0 ? 0 : windowStart + 1}–{end}</Badge><text style={{ fontSize: 11, color: C.muted }}>100 行窗口 · 原生滚轮惯性</text><div style={{ flexGrow: 1 }} /><Button size="sm" variant="ghost">规则</Button><Button size="sm" variant="ghost">全局</Button><Button size="sm" variant="ghost">直连</Button></List.Toolbar>{filteredRows.length === 0 ? <List.Empty title="没有匹配的节点" description="换一个关键词再试试" /> : <virtual-list itemCount={filteredRows.length} windowStart={windowStart} estimatedItemHeight={68} overdraw={360} style={{ flexGrow: 1, minHeight: 0 }} onVisibleRange={onVisibleRange}>{filteredRows.slice(windowStart, end).map((node) => <List.Item key={node.id} testId={`proxy-${node.id}`} selected={selected === node.id} onClick={() => setSelected(node.id)}><List.ItemLeading tone={node.latency < 150 ? 'success' : node.latency < 260 ? 'info' : 'warning'}>{node.flag}</List.ItemLeading><List.ItemContent><List.ItemTitle>{node.name}</List.ItemTitle><List.ItemDescription>{node.protocol} · UDP · {node.location} · TLS ready</List.ItemDescription></List.ItemContent><List.ItemMeta><text style={{ fontSize: 14, fontWeight: 800, whiteSpace: 'nowrap', color: node.latency < 150 ? C.green : node.latency < 260 ? C.violet : C.orange }}>{node.latency} ms</text><Badge tone={selected === node.id ? 'info' : 'neutral'}>{selected === node.id ? '当前节点' : '可用'}</Badge></List.ItemMeta><List.ItemActions><Button size="sm" variant={selected === node.id ? 'primary' : 'secondary'} onClick={() => setSelected(node.id)}>{selected === node.id ? '已选择' : '选择'}</Button><Button size="sm" variant="ghost">•••</Button></List.ItemActions></List.Item>)}</virtual-list>}</List.Root>
}

const ProxyRow = memo(function ProxyRow({ node, selected, onSelect, mobile = false }: { node: typeof PROXY_ROWS[number]; selected: boolean; onSelect: (id: string) => void; mobile?: boolean }) {
  const { tokens: C } = useTheme()
  const color = node.latency < 150 ? C.green : node.latency < 260 ? C.violet : C.orange
  if (mobile) return <List.Item testId={`proxy-${node.id}`} selected={selected} onClick={() => onSelect(node.id)} style={{ height: 104, minHeight: 104, maxHeight: 104, flexDirection: 'column', alignItems: 'stretch', gap: 4, paddingTop: 8, paddingBottom: 8 }}>
    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 }}>
      <List.ItemLeading tone={node.latency < 150 ? 'success' : 'info'}>{node.flag}</List.ItemLeading>
      <List.ItemContent><List.ItemTitle>{node.name}</List.ItemTitle><List.ItemDescription>{node.protocol} · UDP</List.ItemDescription></List.ItemContent>
      <Button testId={`choose-${node.id}`} width={66} size="sm" variant={selected ? 'primary' : 'secondary'} style={{ flexShrink: 0, height: 42, paddingLeft: 4, paddingRight: 4 }} onClick={() => onSelect(node.id)}>{selected ? '已选择' : '选择'}</Button>
    </div>
    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
      <List.ItemMeta><text style={{ width: 92, fontSize: 14, fontWeight: 700, textAlign: 'center', color }}>{node.latency} ms</text><Badge width={62} tone={selected ? 'info' : 'neutral'}>{selected ? '当前节点' : '可用'}</Badge></List.ItemMeta>
    </div>
  </List.Item>
  return <List.Item testId={`proxy-${node.id}`} selected={selected} onClick={() => onSelect(node.id)}>
    <List.ItemLeading tone={node.latency < 150 ? 'success' : node.latency < 260 ? 'info' : 'warning'}>{node.flag}</List.ItemLeading>
    <List.ItemContent><List.ItemTitle>{node.name}</List.ItemTitle><List.ItemDescription>{node.protocol} · UDP · {node.location} · TLS ready</List.ItemDescription></List.ItemContent>
    <List.ItemMeta><div style={{ width: 92, display: 'flex', flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 2 }}><text style={{ fontSize: 14, fontWeight: 800, color, whiteSpace: 'nowrap' }}>{node.latency}</text><text style={{ fontSize: 11, color, whiteSpace: 'nowrap' }}>ms</text></div><Badge width={62} tone={selected ? 'info' : 'neutral'}>{selected ? '当前节点' : '可用'}</Badge></List.ItemMeta>
    <List.ItemActions><Button width={58} size="sm" variant={selected ? 'primary' : 'secondary'} onClick={() => onSelect(node.id)}>{selected ? '已选择' : '选择'}</Button><Button width={34} size="sm" variant="ghost">•••</Button></List.ItemActions>
  </List.Item>
})

function Proxies() {
  const mobile = useWindowSize().width < 760
  const [selected, setSelected] = useState(PROXY_ROWS[1].id)
  const [query, setQuery] = useState('')
  const [windowStart, setWindowStart] = useState(0)
  const windowStartRef = useRef(0)
  const filteredRows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return needle ? PROXY_ROWS.filter((row) => row.name.toLowerCase().includes(needle) || row.protocol.toLowerCase().includes(needle)) : PROXY_ROWS
  }, [query])
  const windowSize = 100
  const maxStart = Math.max(0, filteredRows.length - windowSize)
  const end = Math.min(filteredRows.length, windowStart + windowSize)
  const selectNode = useCallback((id: string) => setSelected(id), [])
  const resetWindow = useCallback(() => {
    windowStartRef.current = 0
    setWindowStart(0)
  }, [])
  // The native list reports its visible range continuously during inertia.
  // Re-slicing 100 React rows for every crossed item floods the renderer and
  // defeats virtualisation. Keep a 24-row safety band, advance a normal
  // re-window by 8 rows, and only re-center after a real fast jump.
  const onVisibleRange = useCallback((event: { startIndex?: number; endIndex?: number }) => {
    const start = Math.max(0, Math.floor(event.startIndex ?? 0))
    const endIndex = Math.max(start + 1, Math.ceil(event.endIndex ?? start + 1))
    const current = windowStartRef.current
    const currentEnd = Math.min(filteredRows.length, current + windowSize)
    const safelyBuffered = start >= current + 24 && endIndex <= currentEnd - 24
    if (safelyBuffered) return
    const jumpedOutsideWindow = start < current || endIndex > currentEnd
    const next = jumpedOutsideWindow
      ? Math.max(0, Math.min(maxStart, Math.floor(start - windowSize / 2)))
      : start < current + 24
        ? Math.max(0, current - 8)
        : Math.min(maxStart, current + 8)
    if (next === current) return
    windowStartRef.current = next
    setWindowStart(next)
  }, [filteredRows.length, maxStart])
  return <List.Root style={{ height: '100%' }}>
    <List.Header title="GPUIX · 代理节点" description={mobile ? "选择当前使用的节点" : "GPUIX virtual-list · 只挂载当前窗口，滚动时由原生列表接管"} count={`${filteredRows.length.toLocaleString()} 个节点`} action={mobile ? undefined : <><Badge tone="success">96 在线</Badge><Button size="sm" variant="secondary">批量测速</Button></>} />
    <List.Toolbar><div style={{ width: mobile ? undefined : 240, flexGrow: mobile ? 1 : undefined, minWidth: 0 }}><Input value={query} placeholder="搜索节点或协议" onChange={(value) => { setQuery(value); resetWindow() }} testId="proxy-search" /></div><Badge width={88} tone="info">窗口 {filteredRows.length === 0 ? 0 : windowStart + 1}–{end}</Badge>{!mobile && <text style={{ fontSize: 11, color: '#A1A1AA', whiteSpace: 'nowrap' }}>100 行窗口 · 原生滚轮惯性</text>}{!mobile && <><div style={{ flexGrow: 1 }} /><Button size="sm" variant="ghost">规则</Button></>}</List.Toolbar>
    {filteredRows.length === 0 ? <List.Empty title="没有匹配的节点" description="换一个关键词再试试" /> : <virtual-list itemCount={filteredRows.length} windowStart={windowStart} estimatedItemHeight={mobile ? 104 : 68} overdraw={360} style={{ flexGrow: 1, minHeight: 0 }} onVisibleRange={onVisibleRange}>{filteredRows.slice(windowStart, end).map((node) => <ProxyRow mobile={mobile} key={node.id} node={node} selected={selected === node.id} onSelect={selectNode} />)}</virtual-list>}
  </List.Root>
}

function Subscriptions() {
  const { tokens: C } = useTheme()
  const [profile, setProfile] = useState('workbench-backup.yaml')
  const profiles = [{ value: 'workbench-backup.yaml', label: 'workbench-backup.yaml' }, { value: 'workbench-backup.yaml', label: 'workbench-backup.yaml' }, { value: 'personal.yaml', label: 'personal.yaml' }]
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}><Card.Root><Card.Header title="订阅管理" description="管理远程配置与更新策略" icon="▤" action={<Button variant="primary">添加订阅</Button>} /><Card.Content><div style={{ display: 'flex', flexDirection: 'row', gap: 12, alignItems: 'flex-end' }}><div style={{ flexGrow: 1 }}><Select.Root value={profile} onValueChange={(value) => setProfile(value as string)} items={profiles}><Select.Trigger><Select.Value /><Select.Icon /></Select.Trigger><Select.Content>{profiles.map((item) => <Select.Item key={item.value} value={item.value}>{item.label}</Select.Item>)}</Select.Content></Select.Root></div><Button variant="secondary">立即更新</Button></div><div style={{ display: 'flex', flexDirection: 'row', gap: 9, paddingTop: 4 }}><Badge tone="success">更新成功</Badge><text style={{ fontSize: 12, color: C.muted }}>2026-09-17 12:32 · 下次更新 6 小时后</text></div></Card.Content></Card.Root><Card.Root><Card.Header title="新增订阅" description="组件化表单示例" icon="＋" /><Card.Content><Input label="订阅地址" placeholder="https://example.com/profile.yaml" /><div style={{ display: 'flex', flexDirection: 'row', gap: 12 }}><div style={{ flexGrow: 1 }}><Input label="备注" placeholder="工作代理" /></div><div style={{ width: 180 }}><Select.Root defaultValue="每日" items={[{ value: '每日', label: '每日' }, { value: '每周', label: '每周' }, { value: '手动', label: '手动' }]}><Select.Trigger><Select.Value /><Select.Icon /></Select.Trigger><Select.Content><Select.Item value="每日">每日</Select.Item><Select.Item value="每周">每周</Select.Item><Select.Item value="手动">手动</Select.Item></Select.Content></Select.Root></div></div><div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}><Button variant="ghost">取消</Button><Button variant="primary">保存订阅</Button></div></Card.Content></Card.Root></div>
}

function Connections() {
  const { tokens: C } = useTheme()
  const connections = [{ process: 'Cursor', host: 'api.openai.com', rule: 'AI', type: 'TCP' }, { process: 'Safari', host: 'github.com', rule: 'Proxy', type: 'TCP' }, { process: 'Arc', host: 'fonts.gstatic.com', rule: 'Proxy', type: 'TLS' }, { process: 'Telegram', host: '149.154.167.51', rule: 'Global', type: 'TCP' }, { process: 'System', host: 'time.apple.com', rule: 'DIRECT', type: 'UDP' }]
  return <Card.Root><Card.Header title="活动连接" description="实时网络连接 · 5 个活动" icon="◎" action={<div style={{ display: 'flex', flexDirection: 'row', gap: 8 }}><Input placeholder="搜索进程或域名" /><Button variant="secondary">清理全部</Button></div>} /><Card.Content gap={7}>{connections.map((item) => <div key={item.host} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 8, backgroundColor: C.row, borderWidth: 1, borderColor: C.border }}><div style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: C.iconBg }}><Glyph color={C.violet}>{item.process.slice(0, 1)}</Glyph></div><div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 3 }}><text style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{item.process}</text><text style={{ fontSize: 11, color: C.muted }}>{item.host}</text></div><Badge tone={item.rule === 'DIRECT' ? 'neutral' : 'info'}>{item.rule}</Badge><Badge>{item.type}</Badge><text style={{ width: 58, fontSize: 12, color: C.green, textAlign: 'right' }}>已连接</text></div>)}</Card.Content></Card.Root>
}

function Settings({ mode, setMode }: { mode: ThemeMode; setMode: (mode: ThemeMode) => void }) {
  const { tokens: C } = useTheme()
  const mobile = useWindowSize().width < 760
  return <div style={{ display: 'flex', flexDirection: mobile ? 'column' : 'row', gap: 16, alignItems: 'stretch' }}><div style={{ width: mobile ? '100%' : '50%', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}><Card.Root><Card.Header title="系统设置" description="运行方式与系统集成" icon="⚙" /><Card.Content><SettingRow title="虚拟网卡模式" description="应用将通过虚拟网卡访问网络" checked /><SettingRow title="系统代理" description="将代理写入系统网络设置" /><SettingRow title="开机自启" description="登录后自动启动 GPUIX" /></Card.Content></Card.Root><Card.Root><Card.Header title="Clash 设置" description="内核和连接参数" icon="⌁" /><Card.Content><SettingRow title="统一延迟" description="使用统一延迟测试策略" checked /><SettingRow title="IPv6" description="允许 IPv6 出站连接" /><div style={{ display: 'flex', flexDirection: 'row', gap: 12 }}><div style={{ flexGrow: 1, minWidth: 0 }}><Input label="端口设置" value="7890" /></div><div style={{ flexGrow: 1, minWidth: 0 }}><Select.Root defaultValue="Info" items={[{ value: 'Info', label: 'Info' }, { value: 'Debug', label: 'Debug' }, { value: 'Warn', label: 'Warn' }]}><Select.Trigger><Select.Value /><Select.Icon /></Select.Trigger><Select.Content><Select.Item value="Info">Info</Select.Item><Select.Item value="Debug">Debug</Select.Item><Select.Item value="Warn">Warn</Select.Item></Select.Content></Select.Root></div></div></Card.Content></Card.Root></div><div style={{ width: mobile ? '100%' : '50%', minWidth: 0 }}><Card.Root><Card.Header title="界面设置" description="主题、语言与交互" icon="✦" /><Card.Content><Select.Root defaultValue="中文" items={[{ value: '中文', label: '中文' }, { value: 'English', label: 'English' }]}><Select.Trigger><Select.Value /><Select.Icon /></Select.Trigger><Select.Content><Select.Item value="中文">中文</Select.Item><Select.Item value="English">English</Select.Item></Select.Content></Select.Root><text style={{ paddingTop: 7, fontSize: 12, fontWeight: 700, color: C.muted }}>主题模式</text><Tabs value={mode} onValueChange={(next) => setMode(next as ThemeMode)}><Tabs.List><Tabs.Trigger value="light">浅色</Tabs.Trigger><Tabs.Trigger value="dark">深色</Tabs.Trigger><Tabs.Trigger value="system">系统</Tabs.Trigger></Tabs.List></Tabs><div style={{ height: 1, marginTop: 7, marginBottom: 4, backgroundColor: C.border }} /><SettingRow title="托盘点击事件" description="点击托盘显示主窗口" checked /><SettingRow title="显示动画" description="启用界面过渡效果" checked /></Card.Content></Card.Root></div></div>
}

function SettingRow({ title, description, checked = false }: { title: string; description: string; checked?: boolean }) {
  const { tokens: C } = useTheme()
  return <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 5, paddingBottom: 5 }}><div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 3 }}><text style={{ fontSize: 13, fontWeight: 700 }}>{title}</text><text style={{ fontSize: 11, color: C.muted }}>{description}</text></div><Switch defaultChecked={checked} /></div>
}

function Placeholder({ page }: { page: PageId }) {
  const { tokens: C } = useTheme()
  return <Card.Root><Card.Header title={TITLES[page]} description="同一套组件可以继续组合出更多业务页面" icon="◇" /><Card.Content><div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, paddingTop: 60, paddingBottom: 60 }}><div style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: C.iconBg }}><Glyph color={C.violet} size={24}>✦</Glyph></div><text style={{ fontSize: 15, fontWeight: 700, color: C.text }}>页面骨架已就绪</text><text style={{ fontSize: 12, color: C.muted }}>可以直接复用 Card、Tabs、Select、Switch 和主题 token。</text></div></Card.Content></Card.Root>
}

render(<ThemeProvider initialMode="dark"><Shell /></ThemeProvider>, Reflect.get(globalThis, '__gpuixAndroid')
  ? { title: 'GPUIX Base UI' }
  : { title: 'gpuix-base-ui', width: 1280, height: 860, minWidth: 1024, minHeight: 768, resizable: true })

import { useMemo, useState, type ReactNode } from 'react'
import {
  Accordion, AlertDialog, Autocomplete, Avatar, Button, Checkbox, CheckboxGroup, Collapsible, Combobox,
  ContextMenu, Dialog, Drawer, Field, Fieldset, Form, Input, Menu, Menubar, Meter, NavigationMenu,
  NumberField, OTPField, Popover, PreviewCard, Progress, Radio, RadioGroup, ScrollArea, Select, Separator,
  Slider, Switch, Tabs, Toast, Toggle, ToggleGroup, Toolbar, Tooltip, useToastManager,
} from './src'
import { Card, IconButton, useTheme } from './src'

function Section({ title, description, children, testId }: { title: string; description?: string; children: ReactNode; testId?: string }) {
  return <Card.Root testId={testId}><Card.Header title={title} description={description} icon="◇" /><Card.Content>{children}</Card.Content></Card.Root>
}

function ToastList() {
  const manager = useToastManager()
  return <>{manager.toasts.map((toast) => (
    <Toast.Root key={toast.id} toast={toast} testId={`gallery-toast-${toast.id}`}>
      <Toast.Content><Toast.Title /><Toast.Description /></Toast.Content>
      <Toast.Close />
    </Toast.Root>
  ))}</>
}

function ToastDemo() {
  const manager = useToastManager()
  const { tokens: C } = useTheme()
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    <text style={{ fontSize: 11, color: C.muted }}>Toast · 点击后出现在窗口右下角</text>
    <div style={{ display: 'flex', flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
      <Button size="sm" testId="gallery-toast-add" onClick={() => manager.add({ title: '订阅已更新', description: 'workbench-backup.yaml · 12:32', type: 'success' })}>普通 Toast</Button>
      <Button size="sm" testId="gallery-toast-promise" onClick={() => { void manager.promise(new Promise((resolve) => setTimeout(resolve, 600)), { loading: { title: '测速中…', description: '正在请求 5000 个节点' }, success: { title: '测速完成', description: '96 个节点在线', type: 'success' }, error: { title: '测速失败', type: 'error' } }) }}>Promise Toast</Button>
      <Button size="sm" testId="gallery-toast-many" onClick={() => { for (let index = 1; index <= 4; index += 1) manager.add({ title: `通知 ${index}`, description: '最多同时显示 3 条,其余标记 limited', type: 'info' }) }}>连发 4 条</Button>
    </div>
  </div>
}

function OverviewSection() {
  const { tokens: C } = useTheme()
  const families = ['Accordion', 'AlertDialog', 'Autocomplete', 'Avatar', 'Button', 'Checkbox', 'CheckboxGroup', 'Collapsible', 'Combobox', 'ContextMenu', 'Dialog', 'Drawer', 'Field', 'Fieldset', 'Form', 'Input', 'Menu', 'Menubar', 'Meter', 'NavigationMenu', 'NumberField', 'OTPField', 'Popover', 'PreviewCard', 'Progress', 'RadioGroup', 'ScrollArea', 'Select', 'Separator', 'Slider', 'Switch', 'Tabs', 'Toast', 'Toggle', 'ToggleGroup', 'Toolbar', 'Tooltip']
  const extras = ['mergeProps', 'useRender', 'CSPProvider', 'DirectionProvider', 'List']
  return <Section title="组件总览" description="37 个 Base UI 家族全部可交互 · 外加工具与 List" testId="gallery-overview">
    <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {families.map((name) => <div key={name} style={{ height: 26, display: 'flex', alignItems: 'center', paddingLeft: 9, paddingRight: 9, borderRadius: 6, backgroundColor: C.control, borderWidth: 1, borderColor: C.border }}>
        <text style={{ fontFamily: 'Menlo', fontSize: 11, color: C.text }}>{name}</text>
      </div>)}
    </div>
    <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingTop: 6 }}>
      {extras.map((name) => <div key={name} style={{ height: 26, display: 'flex', alignItems: 'center', paddingLeft: 9, paddingRight: 9, borderRadius: 6, backgroundColor: `${C.violet}1A`, borderWidth: 1, borderColor: `${C.violet}55` }}>
        <text style={{ fontFamily: 'Menlo', fontSize: 11, color: C.violet }}>{name}</text>
      </div>)}
    </div>
  </Section>
}

function ButtonsDemo() {
  const [toggles, setToggles] = useState<string[]>(['latency'])
  const [pressed, setPressed] = useState(true)
  return <Section title="Button / Toggle / Toolbar" description="按压、键盘与 roving focus" testId="gallery-buttons">
    <div style={{ display: 'flex', flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <Button variant="primary" testId="gallery-button-primary" onClick={() => undefined}>主要操作</Button>
      <Button variant="secondary" icon="⌁" testId="gallery-button-secondary">切换节点</Button>
      <Button variant="ghost" testId="gallery-button-ghost">次要</Button>
      <Button variant="destructive" testId="gallery-button-danger">删除</Button>
      <Button disabled testId="gallery-button-disabled">禁用</Button>
      <IconButton label="更多">•••</IconButton>
    </div>
    <div style={{ display: 'flex', flexDirection: 'row', gap: 10, alignItems: 'center', paddingTop: 6 }}>
      <ToggleGroup multiple value={toggles} onValueChange={setToggles} testId="gallery-toggle-group">
        <ToggleGroup.Item value="latency" testId="gallery-toggle-latency">延迟</ToggleGroup.Item>
        <ToggleGroup.Item value="speed" testId="gallery-toggle-speed">速度</ToggleGroup.Item>
        <ToggleGroup.Item value="stable" testId="gallery-toggle-stable">稳定</ToggleGroup.Item>
      </ToggleGroup>
      <Toggle pressed={pressed} onPressedChange={setPressed} testId="gallery-toggle">单独 Toggle</Toggle>
    </div>
    <Toolbar testId="gallery-toolbar" style={{ marginTop: 10 }}>
      <Toolbar.Button testId="gallery-toolbar-bold">B</Toolbar.Button>
      <Toolbar.Button testId="gallery-toolbar-italic">I</Toolbar.Button>
      <Toolbar.Separator />
      <Toolbar.Group>
        <Toolbar.Button>左</Toolbar.Button>
        <Toolbar.Button>中</Toolbar.Button>
      </Toolbar.Group>
      <Toolbar.Input placeholder="搜索规则" testId="gallery-toolbar-input" />
    </Toolbar>
  </Section>
}

function CheckboxDemo() {
  const [group, setGroup] = useState<string[]>(['auto'])
  return <CheckboxGroup value={group} onValueChange={setGroup} allValues={['auto', 'udp', 'tls']} testId="gallery-checkbox-group">
    <div style={{ display: 'flex', flexDirection: 'row', gap: 14, alignItems: 'center' }}>
      <Checkbox parent value="all" label="全选" testId="gallery-checkbox-all" />
      <Checkbox value="auto" label="自动" testId="gallery-checkbox-auto" />
      <Checkbox value="udp" label="UDP" testId="gallery-checkbox-udp" />
      <Checkbox value="tls" label="TLS" testId="gallery-checkbox-tls" />
    </div>
  </CheckboxGroup>
}

function RadioSwitchDemo() {
  const { tokens: C } = useTheme()
  const [radio, setRadio] = useState('rule')
  const [checked, setChecked] = useState(true)
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
    <RadioGroup value={radio} onValueChange={(value) => setRadio(String(value))} testId="gallery-radio-group">
      <div style={{ display: 'flex', flexDirection: 'row', gap: 14, alignItems: 'center', color: C.text }}>
        <Radio value="rule" label="规则" testId="gallery-radio-rule" />
        <Radio value="global" label="全局" testId="gallery-radio-global" />
        <Radio value="direct" label="直连" testId="gallery-radio-direct" />
      </div>
    </RadioGroup>
    <Switch checked={checked} onCheckedChange={setChecked} label="虚拟网卡模式" testId="gallery-switch" />
    <div style={{ width: 260 }}><Input label="备注" value="workbench" testId="gallery-input" /></div>
  </div>
}

function FormDemo() {
  return <div style={{ width: 260 }}>
    <Form onFormSubmit={() => undefined} testId="gallery-form">
      <Field.Root name="host" validate={(value) => String(value ?? '').length < 3 ? '至少 3 个字符' : null} validationMode="onSubmit">
        <Field.Label>服务器地址</Field.Label>
        <Field.Control placeholder="example.com" testId="gallery-field-host" />
        <Field.Description>用于订阅更新的来源地址</Field.Description>
        <Field.Error testId="gallery-field-error" />
      </Field.Root>
      <Form.Submit testId="gallery-form-submit">提交表单</Form.Submit>
    </Form>
  </div>
}

function SliderDemo() {
  const [slider, setSlider] = useState(62)
  const [range, setRange] = useState<number[]>([20, 70])
  return <div style={{ width: 260, display: 'flex', flexDirection: 'column', gap: 12 }}>
    <Slider value={slider} onValueChange={(value) => setSlider(value as number)} testId="gallery-slider"><Slider.Label>单值滑块</Slider.Label><Slider.Value /><Slider.Control><Slider.Track><Slider.Indicator /><Slider.Thumb testId="gallery-slider-thumb" /></Slider.Track></Slider.Control></Slider>
    <Slider value={range} onValueChange={(value) => setRange(value as number[])} min={0} max={100} testId="gallery-range"><Slider.Label>区间滑块</Slider.Label><Slider.Value /><Slider.Control><Slider.Track><Slider.Indicator /><Slider.Thumb index={0} testId="gallery-range-thumb-0" /><Slider.Thumb index={1} testId="gallery-range-thumb-1" /></Slider.Track></Slider.Control></Slider>
  </div>
}

function NumberOtpDemo() {
  const [number, setNumber] = useState(117)
  const [otp, setOtp] = useState('')
  const [code, setCode] = useState('')
  return <div style={{ width: 300, display: 'flex', flexDirection: 'column', gap: 12 }}>
    <NumberField value={number} onValueChange={(value) => setNumber(value as number)} min={0} max={400} testId="gallery-number">
      <NumberField.ScrubArea />
      <NumberField.Group><NumberField.Decrement /><NumberField.Input testId="gallery-number-input" /><NumberField.Increment /></NumberField.Group>
    </NumberField>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <text style={{ fontSize: 11, color: '#71717A' }}>6 位数字验证码</text>
      <OTPField length={6} value={otp} onValueChange={setOtp} testId="gallery-otp">
        <OTPField.Group>
          <OTPField.Input testId="gallery-otp-0" /><OTPField.Input testId="gallery-otp-1" /><OTPField.Input testId="gallery-otp-2" />
          <OTPField.Separator />
          <OTPField.Input testId="gallery-otp-3" /><OTPField.Input testId="gallery-otp-4" /><OTPField.Input testId="gallery-otp-5" />
        </OTPField.Group>
      </OTPField>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <text style={{ fontSize: 11, color: '#71717A' }}>8 位邀请码 · 中英文数字</text>
      <OTPField length={8} value={code} onValueChange={setCode} validationType="none" testId="gallery-otp8">
        <OTPField.Group>
          {Array.from({ length: 8 }, (_, index) => <OTPField.Input key={index} index={index} testId={`gallery-otp8-${index}`} />)}
        </OTPField.Group>
      </OTPField>
    </div>
  </div>
}

function FormsSection() {
  return <Section title="表单族" description="Field / Form / Checkbox / Radio / Switch / Slider / NumberField / OTP" testId="gallery-forms">
    <div style={{ display: 'flex', flexDirection: 'row', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <FormDemo />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <CheckboxDemo />
        <RadioSwitchDemo />
      </div>
      <SliderDemo />
      <NumberOtpDemo />
    </div>
  </Section>
}

function ChoosersDemo() {
  const [select, setSelect] = useState('新加坡 01')
  const [combo, setCombo] = useState<string | null>('Hysteria2')
  const nodeItems = useMemo(() => ['新加坡 01', '香港 01', '日本 01', '美国 01'].map((name) => ({ value: name, label: name })), [])
  return <div style={{ display: 'flex', flexDirection: 'row', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
    <div style={{ width: 230 }}><Select.Root value={select} onValueChange={(value) => setSelect(value as string)} items={nodeItems} testId="gallery-select"><Select.Label>节点</Select.Label><Select.Trigger testId="gallery-select-trigger"><Select.Value /><Select.Icon /></Select.Trigger><Select.Portal><Select.Positioner align="start"><Select.Popup testId="gallery-select-popup"><Select.List>{nodeItems.map((item) => <Select.Item key={item.value} value={item.value} testId={`gallery-select-item-${item.value}`}>{item.label}</Select.Item>)}</Select.List><Select.ScrollDownArrow /></Select.Popup></Select.Positioner></Select.Portal></Select.Root></div>
    <div style={{ width: 230 }}>
      <Combobox value={combo} onValueChange={(value) => setCombo(value as string)} items={[{ value: 'Hysteria2', label: 'Hysteria2' }, { value: 'AnyTLS', label: 'AnyTLS' }, { value: 'VLESS', label: 'VLESS' }]} testId="gallery-combobox">
        <Combobox.Label>协议</Combobox.Label>
        <Combobox.InputGroup><Combobox.Input placeholder="搜索协议" testId="gallery-combobox-input" /><Combobox.Trigger /></Combobox.InputGroup>
        <Combobox.Portal><Combobox.Positioner><Combobox.Popup testId="gallery-combobox-popup"><Combobox.Empty /><Combobox.List /></Combobox.Popup></Combobox.Positioner></Combobox.Portal>
      </Combobox>
    </div>
    <div style={{ width: 230 }}>
      <Autocomplete items={['api.openai.com', 'github.com', 'fonts.gstatic.com', 'time.apple.com']} testId="gallery-autocomplete">
        <Autocomplete.Label>域名</Autocomplete.Label>
        <Autocomplete.InputGroup><Autocomplete.Input placeholder="输入域名" testId="gallery-autocomplete-input" /><Autocomplete.Clear /></Autocomplete.InputGroup>
        <Autocomplete.Portal><Autocomplete.Positioner><Autocomplete.Popup testId="gallery-autocomplete-popup"><Autocomplete.Empty /><Autocomplete.List /></Autocomplete.Popup></Autocomplete.Positioner></Autocomplete.Portal>
      </Autocomplete>
    </div>
  </div>
}

function MenuDemo() {
  const { tokens: C } = useTheme()
  const [menuChoice, setMenuChoice] = useState('未选择')
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
    <Menu.Root>
      <Menu.Trigger testId="gallery-menu-trigger">节点操作</Menu.Trigger>
      <Menu.Portal><Menu.Positioner><Menu.Popup testId="gallery-menu-popup">
        <Menu.Item testId="gallery-menu-copy" onClick={() => setMenuChoice('复制')}>复制节点</Menu.Item>
        <Menu.Item testId="gallery-menu-ping" onClick={() => setMenuChoice('测速')}>延迟测速</Menu.Item>
        <Menu.Separator />
        <Menu.CheckboxItem defaultChecked label="自动更新">自动更新</Menu.CheckboxItem>
        <Menu.SubmenuRoot>
          <Menu.SubmenuTrigger>导出为…</Menu.SubmenuTrigger>
          <Menu.Portal><Menu.Positioner><Menu.Popup>
            <Menu.Item onClick={() => setMenuChoice('YAML')}>YAML</Menu.Item>
            <Menu.Item onClick={() => setMenuChoice('JSON')}>JSON</Menu.Item>
          </Menu.Popup></Menu.Positioner></Menu.Portal>
        </Menu.SubmenuRoot>
      </Menu.Popup></Menu.Positioner></Menu.Portal>
    </Menu.Root>
    <text testId="gallery-menu-result" style={{ fontSize: 12, color: C.muted }}>菜单选择:{menuChoice}</text>
    <ContextMenu.Root>
      <ContextMenu.Trigger>
        <div testId="gallery-context-area" style={{ width: 220, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 9, borderWidth: 1, borderColor: C.borderStrong, backgroundColor: C.row }}>
          <text style={{ fontSize: 12, color: C.muted }}>右键打开上下文菜单</text>
        </div>
      </ContextMenu.Trigger>
      <ContextMenu.Popup testId="gallery-context-popup">
        <ContextMenu.Item onClick={() => setMenuChoice('复制域名')}>复制域名</ContextMenu.Item>
        <ContextMenu.Item onClick={() => setMenuChoice('断开连接')}>断开连接</ContextMenu.Item>
      </ContextMenu.Popup>
    </ContextMenu.Root>
  </div>
}

function ChoosersSection() {
  return <Section title="选择族" description="Select / Combobox / Autocomplete / Menu / ContextMenu" testId="gallery-choosers">
    <div style={{ display: 'flex', flexDirection: 'row', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <ChoosersDemo />
      <MenuDemo />
    </div>
  </Section>
}

function OverlayDemo({ label, children, testId }: { label: string; children: ReactNode; testId?: string }) {
  const { tokens: C } = useTheme()
  return <div testId={testId} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <text style={{ fontSize: 11, color: C.muted }}>{label}</text>
    {children}
  </div>
}

function OverlaysSection() {
  const { tokens: C } = useTheme()
  return <Section title="浮层族" description="Dialog / AlertDialog / Drawer(左中右) / Popover / Tooltip / PreviewCard" testId="gallery-overlays">
    <div style={{ display: 'flex', flexDirection: 'row', gap: 14, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <OverlayDemo label="Dialog" testId="gallery-demo-dialog">
        <Dialog.Root>
          <Dialog.Trigger testId="gallery-dialog-trigger">打开 Dialog</Dialog.Trigger>
          <Dialog.Portal><Dialog.Backdrop /><Dialog.Popup testId="gallery-dialog-popup"><Dialog.Title>编辑订阅</Dialog.Title><Dialog.Description>更改将在保存后立即生效。</Dialog.Description><Input label="订阅地址" value="https://example.com/profile.yaml" /><div style={{ display: 'flex', flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}><Dialog.Close testId="gallery-dialog-cancel">取消</Dialog.Close><Dialog.Close testId="gallery-dialog-confirm">保存</Dialog.Close></div></Dialog.Popup></Dialog.Portal>
        </Dialog.Root>
      </OverlayDemo>
      <OverlayDemo label="AlertDialog" testId="gallery-demo-alert">
        <AlertDialog.Root>
          <AlertDialog.Trigger testId="gallery-alert-trigger">删除订阅</AlertDialog.Trigger>
          <AlertDialog.Portal><AlertDialog.Backdrop /><AlertDialog.Popup testId="gallery-alert-popup"><AlertDialog.Title>确认删除?</AlertDialog.Title><AlertDialog.Description>该操作无法撤销。</AlertDialog.Description><div style={{ display: 'flex', flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}><AlertDialog.Close>取消</AlertDialog.Close><AlertDialog.Close>删除</AlertDialog.Close></div></AlertDialog.Popup></AlertDialog.Portal>
        </AlertDialog.Root>
      </OverlayDemo>
      <OverlayDemo label="Drawer · 底部" testId="gallery-demo-drawer">
        <Drawer.Root swipeDirection="down">
          <Drawer.Trigger testId="gallery-drawer-trigger">打开 Drawer</Drawer.Trigger>
          <Drawer.Portal><Drawer.Backdrop /><Drawer.Popup testId="gallery-drawer-popup"><Drawer.SwipeArea><Drawer.Title>底部抽屉</Drawer.Title></Drawer.SwipeArea><Drawer.Content><text style={{ fontSize: 12, color: C.muted }}>从底部滑出,可向下滑动关闭。</text><Drawer.Close>关闭</Drawer.Close></Drawer.Content></Drawer.Popup></Drawer.Portal>
        </Drawer.Root>
      </OverlayDemo>
      <OverlayDemo label="Sheet · 右侧" testId="gallery-demo-sheet-right">
        <Drawer.Root swipeDirection="left">
          <Drawer.Trigger testId="gallery-sheet-right-trigger">打开右侧 Sheet</Drawer.Trigger>
          <Drawer.Portal><Drawer.Backdrop /><Drawer.Popup testId="gallery-sheet-right-popup"><Drawer.Content><Drawer.Title>右侧面板</Drawer.Title><text style={{ fontSize: 12, color: C.muted }}>适合详情、设置等次要任务。</text><Drawer.Close>关闭</Drawer.Close></Drawer.Content></Drawer.Popup></Drawer.Portal>
        </Drawer.Root>
      </OverlayDemo>
      <OverlayDemo label="Sheet · 左侧" testId="gallery-demo-sheet-left">
        <Drawer.Root swipeDirection="right">
          <Drawer.Trigger testId="gallery-sheet-left-trigger">打开左侧 Sheet</Drawer.Trigger>
          <Drawer.Portal><Drawer.Backdrop /><Drawer.Popup testId="gallery-sheet-left-popup"><Drawer.Content><Drawer.Title>左侧面板</Drawer.Title><text style={{ fontSize: 12, color: C.muted }}>适合导航与分组切换。</text><Drawer.Close>关闭</Drawer.Close></Drawer.Content></Drawer.Popup></Drawer.Portal>
        </Drawer.Root>
      </OverlayDemo>
      <OverlayDemo label="Popover" testId="gallery-demo-popover">
        <Popover.Root>
          <Popover.Trigger testId="gallery-popover-trigger">通知设置</Popover.Trigger>
          <Popover.Portal><Popover.Positioner side="bottom" align="start" sideOffset={8}><Popover.Popup testId="gallery-popover-popup"><Popover.Title>通知</Popover.Title><Popover.Description>你有 3 条未读消息。</Popover.Description><Switch label="开启声音" defaultChecked /></Popover.Popup></Popover.Positioner></Popover.Portal>
        </Popover.Root>
      </OverlayDemo>
      <OverlayDemo label="Tooltip · 悬停" testId="gallery-demo-tooltip">
        <Tooltip.Provider delay={200}><Tooltip.Root><Tooltip.Trigger testId="gallery-tooltip-trigger"><Button variant="secondary" size="sm">悬停查看提示</Button></Tooltip.Trigger><Tooltip.Portal><Tooltip.Positioner><Tooltip.Popup testId="gallery-tooltip-popup">刷新全部订阅</Tooltip.Popup></Tooltip.Positioner></Tooltip.Portal></Tooltip.Root></Tooltip.Provider>
      </OverlayDemo>
      <OverlayDemo label="PreviewCard · 悬停" testId="gallery-demo-preview">
        <PreviewCard.Root>
          <PreviewCard.Trigger testId="gallery-preview-trigger">悬停查看订阅预览</PreviewCard.Trigger>
          <PreviewCard.Portal><PreviewCard.Positioner side="bottom" align="start" sideOffset={8}><PreviewCard.Popup testId="gallery-preview-popup">
            <text style={{ fontFamily: 'Helvetica', fontSize: 13, fontWeight: 700, color: C.text }}>workbench-backup.yaml</text>
            <text style={{ fontSize: 11, color: C.muted }}>4 个节点组 · 96 个节点 · 6 小时后更新</text>
          </PreviewCard.Popup></PreviewCard.Positioner></PreviewCard.Portal>
        </PreviewCard.Root>
      </OverlayDemo>
    </div>
  </Section>
}

function TabsDemo() {
  const { tokens: C } = useTheme()
  const [tab, setTab] = useState('general')
  return <Tabs value={tab} onValueChange={(value) => setTab(String(value))} testId="gallery-tabs">
    <Tabs.List><Tabs.Tab value="general" testId="gallery-tab-general">常规</Tabs.Tab><Tabs.Tab value="network" testId="gallery-tab-network">网络</Tabs.Tab><Tabs.Tab value="about" testId="gallery-tab-about">关于</Tabs.Tab><Tabs.Indicator /></Tabs.List>
    <Tabs.Panel value="general" testId="gallery-tab-panel-general"><text style={{ fontSize: 12, color: C.muted }}>常规设置面板</text></Tabs.Panel>
    <Tabs.Panel value="network" testId="gallery-tab-panel-network"><text style={{ fontSize: 12, color: C.muted }}>网络设置面板</text></Tabs.Panel>
    <Tabs.Panel value="about" testId="gallery-tab-panel-about"><text style={{ fontSize: 12, color: C.muted }}>关于面板</text></Tabs.Panel>
  </Tabs>
}

function AccordionDemo() {
  const { tokens: C } = useTheme()
  return <Accordion defaultValue={['core']} openMultiple testId="gallery-accordion">
    <Accordion.Item value="core" testId="gallery-accordion-item">
      <Accordion.Header><Accordion.Trigger testId="gallery-accordion-trigger">核心设置</Accordion.Trigger></Accordion.Header>
      <Accordion.Panel testId="gallery-accordion-panel"><text style={{ fontSize: 12, color: C.muted }}>混合代理、TUN 与规则模式。</text></Accordion.Panel>
    </Accordion.Item>
    <Accordion.Item value="dns"><Accordion.Header><Accordion.Trigger>DNS 设置</Accordion.Trigger></Accordion.Header><Accordion.Panel><text style={{ fontSize: 12, color: C.muted }}>启用 DoH 与 Fake-IP。</text></Accordion.Panel></Accordion.Item>
  </Accordion>
}

function DisplaySection() {
  const { tokens: C } = useTheme()
  return <Section title="展示族" description="Accordion / Collapsible / Tabs / Meter / Progress / ScrollArea / Toast" testId="gallery-display">
    <div style={{ display: 'flex', flexDirection: 'row', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <div style={{ width: 300 }}>
        <AccordionDemo />
        <div style={{ height: 10 }} />
        <Collapsible defaultOpen testId="gallery-collapsible">
          <Collapsible.Trigger testId="gallery-collapsible-trigger">高级选项</Collapsible.Trigger>
          <Collapsible.Panel testId="gallery-collapsible-panel"><text style={{ fontSize: 12, color: C.muted }}>TCP Fast Open、MPTCP 等。</text></Collapsible.Panel>
        </Collapsible>
      </div>
      <div style={{ width: 300, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <TabsDemo />
        <Meter value={62} testId="gallery-meter"><Meter.Label>内存占用</Meter.Label><Meter.Track><Meter.Indicator /></Meter.Track><Meter.Value /></Meter>
        <Progress value={74} testId="gallery-progress"><Progress.Label>订阅流量</Progress.Label><Progress.Track><Progress.Indicator /></Progress.Track><Progress.Value /></Progress>
      </div>
      <div style={{ width: 300 }}>
        <ScrollArea.Root style={{ height: 190 }} testId="gallery-scrollarea">
          <ScrollArea.Viewport testId="gallery-scrollarea-viewport"><ScrollArea.Content>
            {Array.from({ length: 24 }, (_, index) => <div key={index} style={{ minHeight: 34, display: 'flex', alignItems: 'center', paddingLeft: 12, fontSize: 12, color: C.muted, borderBottomWidth: 1, borderColor: C.border }}>日志行 {index + 1} · 连接已建立</div>)}
          </ScrollArea.Content></ScrollArea.Viewport>
          <ScrollArea.Scrollbar><ScrollArea.Thumb /></ScrollArea.Scrollbar>
        </ScrollArea.Root>
      </div>
    </div>
    <ToastDemo />
  </Section>
}

function MoreDemo() {
  const [choice, setChoice] = useState('未选择')
  const { tokens: C } = useTheme()
  return <Section title="其余家族" description="Avatar / Fieldset / Menubar / NavigationMenu / PreviewCard / Separator" testId="gallery-more">
    <div style={{ display: 'flex', flexDirection: 'row', gap: 22, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <Avatar.Root testId="gallery-avatar"><Avatar.Fallback>GP</Avatar.Fallback></Avatar.Root>
          <Avatar.Root style={{ width: 30, height: 30 }}><Avatar.Fallback style={{ fontSize: 11 }}>IX</Avatar.Fallback></Avatar.Root>
          <Avatar.Root style={{ width: 46, height: 46 }}><Avatar.Fallback style={{ fontSize: 15 }}>BU</Avatar.Fallback></Avatar.Root>
        </div>
        <Separator />
        <Fieldset.Root testId="gallery-fieldset" style={{ width: 250 }}>
          <Fieldset.Legend>入站设置</Fieldset.Legend>
          <Field.Root name="mixed-port" defaultValue="7890" validate={(value) => Number(value) > 0 && Number(value) < 65536 ? null : '端口范围 1-65535'} validationMode="onChange">
            <Field.Label>混合端口</Field.Label>
            <Field.Control placeholder="7890" testId="gallery-fieldset-port" />
            <Field.Error testId="gallery-fieldset-error" />
          </Field.Root>
        </Fieldset.Root>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Menubar testId="gallery-menubar">
          <Menu.Root>
            <Menu.Trigger testId="gallery-menubar-file">文件</Menu.Trigger>
            <Menu.Portal><Menu.Positioner><Menu.Popup testId="gallery-menubar-file-popup">
              <Menu.Item onClick={() => setChoice('新建订阅')}>新建订阅</Menu.Item>
              <Menu.Item onClick={() => setChoice('导入配置')}>导入配置</Menu.Item>
              <Menu.Separator />
              <Menu.Item onClick={() => setChoice('退出')}>退出</Menu.Item>
            </Menu.Popup></Menu.Positioner></Menu.Portal>
          </Menu.Root>
          <Menu.Root>
            <Menu.Trigger testId="gallery-menubar-view">视图</Menu.Trigger>
            <Menu.Portal><Menu.Positioner><Menu.Popup>
              <Menu.CheckboxItem defaultChecked label="显示延迟">显示延迟</Menu.CheckboxItem>
              <Menu.RadioGroup defaultValue="comfortable">
                <Menu.RadioItem value="compact" label="紧凑">紧凑</Menu.RadioItem>
                <Menu.RadioItem value="comfortable" label="舒适">舒适</Menu.RadioItem>
              </Menu.RadioGroup>
            </Menu.Popup></Menu.Positioner></Menu.Portal>
          </Menu.Root>
        </Menubar>
        <text testId="gallery-more-result" style={{ fontSize: 12, color: C.muted }}>菜单选择:{choice}</text>
        <NavigationMenu defaultValue={null} testId="gallery-navmenu">
          <NavigationMenu.List>
            <NavigationMenu.Item>
              <NavigationMenu.Trigger value="nodes" testId="gallery-navmenu-trigger">节点</NavigationMenu.Trigger>
              <NavigationMenu.Content value="nodes" testId="gallery-navmenu-content">
                <NavigationMenu.Link onClick={() => setChoice('全部节点')}>全部节点</NavigationMenu.Link>
                <NavigationMenu.Link onClick={() => setChoice('延迟排序')}>按延迟排序</NavigationMenu.Link>
              </NavigationMenu.Content>
            </NavigationMenu.Item>
            <NavigationMenu.Item>
              <NavigationMenu.Trigger value="rules">规则</NavigationMenu.Trigger>
              <NavigationMenu.Content value="rules">
                <NavigationMenu.Link>分流规则</NavigationMenu.Link>
                <NavigationMenu.Link>直连列表</NavigationMenu.Link>
              </NavigationMenu.Content>
            </NavigationMenu.Item>
          </NavigationMenu.List>
        </NavigationMenu>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      </div>
    </div>
  </Section>
}

export function Gallery() {
  const [section, setSection] = useState('overview')
  const sections = [
    ['overview', '总览'],
    ['buttons', '按钮'],
    ['forms', '表单'],
    ['choosers', '选择'],
    ['overlays', '浮层'],
    ['display', '展示'],
    ['more', '其他'],
  ] as const
  return <Toast.Provider timeout={4000}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {sections.map(([value, label]) => <Button key={value} size="sm" variant={section === value ? 'primary' : 'secondary'} onClick={() => setSection(value)}>{label}</Button>)}
      </div>
      {section === 'overview' && <OverviewSection />}
      {section === 'buttons' && <ButtonsDemo />}
      {section === 'forms' && <FormsSection />}
      {section === 'choosers' && <ChoosersSection />}
      {section === 'overlays' && <OverlaysSection />}
      {section === 'display' && <DisplaySection />}
      {section === 'more' && <MoreDemo />}
    </div>
    <Toast.Portal><Toast.Viewport testId="gallery-toast-viewport"><ToastList /></Toast.Viewport></Toast.Portal>
  </Toast.Provider>
}

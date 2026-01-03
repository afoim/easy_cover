'use client';

import React from 'react';
import { useCoverStore, RATIOS, AspectRatio } from '@/store/useCoverStore';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { ColorPicker } from '@/components/ui/color-picker';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { IconPicker } from '@/components/cover/IconPicker';
import { Separator } from '@/components/ui/separator';
import { Download, RotateCcw, Maximize, Github, ExternalLink, Settings2 } from 'lucide-react';
import { toPng } from 'html-to-image';

// Helper component for Reset Button
const ResetButton = ({ onClick, tooltip = "重置" }: { onClick: () => void, tooltip?: string }) => (
    <Button 
        variant="ghost" 
        size="icon" 
        className="h-6 w-6 ml-2" 
        onClick={onClick}
        title={tooltip}
    >
        <RotateCcw className="h-3 w-3" />
    </Button>
);

const SPLIT_PRESETS = [
    { name: '默认', left: { x: 0, y: 0 }, right: { x: 0, y: 0 } },
    { name: '上下错位', left: { x: 0, y: -40 }, right: { x: 0, y: 40 } },
    { name: '左右分离', left: { x: -60, y: 0 }, right: { x: 60, y: 0 } },
    { name: '对角分离', left: { x: -40, y: -40 }, right: { x: 40, y: 40 } },
    { name: '聚拢', left: { x: 20, y: 0 }, right: { x: -20, y: 0 } },
];

const SliderWithInput = ({ 
    label, 
    value, 
    onChange, 
    min, 
    max, 
    step = 1 
}: { 
    label: string, 
    value: number, 
    onChange: (val: number) => void, 
    min: number, 
    max: number, 
    step?: number 
}) => {
    return (
        <div className="space-y-1.5">
            <div className="flex justify-between items-center">
                <Label className="text-[10px] text-muted-foreground">{label}</Label>
                <Input
                    type="number"
                    value={value}
                    onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) onChange(val);
                    }}
                    className="h-5 w-12 text-[10px] px-1 text-right"
                />
            </div>
            <Slider 
                value={[value]} 
                min={min} 
                max={max} 
                step={step} 
                onValueChange={(v) => onChange(v[0])} 
            />
        </div>
    );
};

export default function Controls() {
  const store = useCoverStore();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      store.updateBackground({ type: 'image', imageUrl: url });
    }
  };

  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      store.updateIcon({ customIconUrl: url });
    }
  };

  const handleExport = async () => {
    // This requires accessing the DOM node. 
    // Ideally, we pass a ref or use an ID.
    // We'll target the container inside Canvas.
    // Since Controls is a sibling, we might need a way to signal.
    // For now, let's assume we can find the element by a known ID or class.
    // But `html-to-image` works best if we have the Ref.
    // I will dispatch a custom event or use a global ID.
    // Let's add an ID to the Canvas container in Canvas.tsx: id="canvas-export-target"
    
    const node = document.getElementById('canvas-export-target');
    if (!node) return;

    // We might need to handle scaling back to 1 before export, or html-to-image handles it.
    // Usually better to clone and export.
    // For now, simple attempt:
    try {
      const dataUrl = await toPng(node as HTMLElement, { 
          quality: 0.95, 
          pixelRatio: 1,
          filter: (node) => {
              // Exclude elements with the class 'export-exclude'
              if (node.classList && node.classList.contains('export-exclude')) {
                  return false;
              }
              return true;
          }
      });
      const link = document.createElement('a');
      link.download = 'easy-cover.png';
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export failed', err);
    }
  };

  const handleFit = (mode: 'contain' | 'cover') => {
      // Always reset position and rotation
      const updates: any = { positionX: 50, positionY: 50, rotation: 0 };
      
      // We will simply reset scale to 1 and let user manually adjust if they want 'contain'.
      // But for 'cover', we try to calculate a scale that fills the canvas.
      
      if (mode === 'contain') {
          updates.scale = 1;
      } else {
          // Calculate scale to cover
          // 1. Get current canvas dimensions
          const activeRatios = RATIOS.filter((r) => store.selectedRatios.includes(r.label));
          if (activeRatios.length > 0 && store.background.imageUrl) {
               const maxWidth = Math.max(...activeRatios.map((r) => r.width));
               const maxHeight = Math.max(...activeRatios.map((r) => r.height));
               const canvasRatio = maxWidth / maxHeight;

               // 2. Get image dimensions
               const img = new Image();
               img.src = store.background.imageUrl;
               img.onload = () => {
                   const imgRatio = img.naturalWidth / img.naturalHeight;
                   
                   let newScale = 1;
                   if (imgRatio > canvasRatio) {
                       // Image is wider than canvas: Scale based on Height
                       // Contain logic makes width match canvas (if img wider? No.)
                       // Let's revisit: 
                       // In 'contain' (object-fit), img is scaled so it fits inside.
                       // If imgRatio > canvasRatio (Image is flatter):
                       //   It hits the sides first. Width = CanvasWidth. Height = Width / imgRatio.
                       //   To cover, we need Height = CanvasHeight.
                       //   Scale = CanvasHeight / CurrentHeight = CanvasHeight / (CanvasWidth / imgRatio)
                       //         = (CanvasHeight / CanvasWidth) * imgRatio = imgRatio / canvasRatio.
                       newScale = imgRatio / canvasRatio;
                   } else {
                       // Image is taller than canvas:
                       //   It hits top/bottom first. Height = CanvasHeight. Width = Height * imgRatio.
                       //   To cover, we need Width = CanvasWidth.
                       //   Scale = CanvasWidth / CurrentWidth = CanvasWidth / (CanvasHeight * imgRatio)
                       //         = (CanvasWidth / CanvasHeight) / imgRatio = canvasRatio / imgRatio.
                       newScale = canvasRatio / imgRatio;
                   }
                   
                   // Apply with a slight buffer to avoid sub-pixel gaps
                   store.updateBackground({ ...updates, scale: newScale * 1.01 });
               };
               return; // Async update
          } else {
              // Fallback
              updates.scale = 1;
          }
      }
      store.updateBackground(updates);
  };

  const [activeTab, setActiveTab] = React.useState('picker');

  return (
    <div className="w-full md:w-80 h-1/2 md:h-full border-t md:border-t-0 md:border-r bg-background flex flex-col shadow-lg z-10">
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold flex items-center gap-2">
           EasyCover - AcoFork
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
            简单、优雅的纯客户端封面图生成器。无需上传，保护隐私。
        </p>
      </div>
      
      <div className="flex-1 min-h-0 w-full">
        <ScrollArea className="h-full">
            <div className="p-4 space-y-6">
          
          {/* Layout Section */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">布局设置</h3>
            
            <div className="space-y-2">
              <Label>图片比例</Label>
              <div className="grid grid-cols-2 gap-2">
                {RATIOS.map((r) => (
                  <div key={r.label} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`ratio-${r.label}`} 
                      checked={store.selectedRatios.includes(r.label)}
                      onCheckedChange={() => store.toggleRatio(r.label)}
                    />
                    <label htmlFor={`ratio-${r.label}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      {r.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="show-ruler">显示标尺 / 网格</Label>
              <Switch 
                id="show-ruler" 
                checked={store.showRuler} 
                onCheckedChange={store.setShowRuler} 
              />
            </div>
          </section>

          <Separator />

          {/* Text Section */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">文字设置</h3>
            <div className="space-y-2">
              <Label>内容</Label>
              <Input 
                value={store.text.content} 
                onChange={(e) => store.updateText({ content: e.target.value })} 
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="text-split">拆分标题</Label>
              <Switch 
                id="text-split" 
                checked={store.text.isSplit} 
                onCheckedChange={(c) => store.updateText({ isSplit: c })} 
              />
            </div>

            {store.text.isSplit && (
                <div className="space-y-4 p-3 bg-muted/30 rounded-lg border">
                    {/* Presets */}
                    <div className="space-y-2">
                         <Label className="text-xs font-semibold text-muted-foreground">预设风格</Label>
                         <div className="flex flex-wrap gap-2">
                             {SPLIT_PRESETS.map((preset) => (
                                 <Button
                                     key={preset.name}
                                     variant="outline"
                                     size="sm"
                                     className="h-6 text-[10px] px-2"
                                     onClick={() => {
                                         store.updateText({
                                             leftOffsetX: preset.left.x,
                                             leftOffsetY: preset.left.y,
                                             rightOffsetX: preset.right.x,
                                             rightOffsetY: preset.right.y,
                                         });
                                     }}
                                 >
                                     {preset.name}
                                 </Button>
                             ))}
                         </div>
                    </div>

                    <Separator className="bg-border/50"/>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                        {/* Left Control */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <Label className="text-xs font-medium">左侧文字</Label>
                                <ResetButton onClick={() => store.updateText({ leftOffsetX: 0, leftOffsetY: 0 })} />
                            </div>
                            <SliderWithInput 
                                label="水平偏移 X"
                                value={store.text.leftOffsetX}
                                min={-500} max={500}
                                onChange={(v) => store.updateText({ leftOffsetX: v })}
                            />
                            <SliderWithInput 
                                label="垂直偏移 Y"
                                value={store.text.leftOffsetY}
                                min={-500} max={500}
                                onChange={(v) => store.updateText({ leftOffsetY: v })}
                            />
                        </div>

                        {/* Right Control */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <Label className="text-xs font-medium">右侧文字</Label>
                                <ResetButton onClick={() => store.updateText({ rightOffsetX: 0, rightOffsetY: 0 })} />
                            </div>
                            <SliderWithInput 
                                label="水平偏移 X"
                                value={store.text.rightOffsetX}
                                min={-500} max={500}
                                onChange={(v) => store.updateText({ rightOffsetX: v })}
                            />
                            <SliderWithInput 
                                label="垂直偏移 Y"
                                value={store.text.rightOffsetY}
                                min={-500} max={500}
                                onChange={(v) => store.updateText({ rightOffsetY: v })}
                            />
                        </div>
                    </div>
                </div>
            )}
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                 <Label>大小 ({store.text.fontSize}px)</Label>
                 <ResetButton onClick={() => store.updateText({ fontSize: 160 })} />
              </div>
              <Slider 
                value={[store.text.fontSize]} 
                min={12} 
                max={2500} 
                step={1} 
                onValueChange={(v) => store.updateText({ fontSize: v[0] })} 
              />
            </div>

            <div className="flex items-center justify-between">
               <Label>颜色</Label>
               <ColorPicker color={store.text.color} onChange={(c) => store.updateText({ color: c })} />
            </div>

            <div className="space-y-2">
               <div className="flex justify-between items-center">
                   <Label>描边宽度</Label>
                   <ResetButton onClick={() => store.updateText({ strokeWidth: 0 })} />
               </div>
               <Slider 
                 value={[store.text.strokeWidth]} 
                 min={0} 
                 max={10} 
                 step={0.5} 
                 onValueChange={(v) => store.updateText({ strokeWidth: v[0] })} 
               />
            </div>

             <div className="flex items-center justify-between">
               <Label>描边颜色</Label>
               <ColorPicker color={store.text.strokeColor} onChange={(c) => store.updateText({ strokeColor: c })} />
            </div>

            <div className="space-y-2">
               <div className="flex justify-between items-center">
                   <Label>旋转 ({store.text.rotation}°)</Label>
                   <ResetButton onClick={() => store.updateText({ rotation: 0 })} />
               </div>
               <Slider 
                 value={[store.text.rotation]} 
                 min={0} 
                 max={360} 
                 step={1} 
                 onValueChange={(v) => store.updateText({ rotation: v[0] })} 
               />
            </div>
          </section>

          <Separator />

          {/* Icon Section */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">图标设置</h3>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="picker">选择图标</TabsTrigger>
                    <TabsTrigger value="upload">上传图标</TabsTrigger>
                </TabsList>
                
                <TabsContent value="picker" className="space-y-2 mt-2">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label>搜索图标</Label>
                        <a 
                            href="https://yesicon.app/" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-[10px] text-muted-foreground flex items-center hover:text-primary hover:underline"
                        >
                            查找图标名称 <ExternalLink className="w-3 h-3 ml-0.5" />
                        </a>
                      </div>
                      <IconPicker 
                        value={store.icon.name} 
                        onChange={(v) => {
                            store.updateIcon({ name: v, customIconUrl: undefined }); // Clear custom icon when picking new one
                        }} 
                      />
                      <div className="text-center pt-1">
                          <button 
                            className="text-[10px] text-muted-foreground hover:text-primary hover:underline cursor-pointer"
                            onClick={() => setActiveTab('upload')}
                          >
                            没有找到想要的？手动上传！
                          </button>
                      </div>
                    </div>
                </TabsContent>
                
                <TabsContent value="upload" className="space-y-2 mt-2">
                    <div className="space-y-2">
                        <Label>上传图片</Label>
                        <Input type="file" accept="image/*" onChange={handleIconUpload} />
                        {store.icon.customIconUrl && (
                            <>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <Label className="text-xs">图片圆角 ({store.icon.customIconRadius}px)</Label>
                                        <ResetButton onClick={() => store.updateIcon({ customIconRadius: 0 })} />
                                    </div>
                                    <Slider 
                                        value={[store.icon.customIconRadius]} 
                                        min={0} 
                                        max={1000} 
                                        step={5} 
                                        onValueChange={(v) => store.updateIcon({ customIconRadius: v[0] })} 
                                    />
                                </div>

                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="w-full text-xs"
                                    onClick={() => store.updateIcon({ customIconUrl: undefined })}
                                >
                                    清除自定义图标 (使用默认图标)
                                </Button>
                            </>
                        )}
                    </div>
                </TabsContent>
            </Tabs>

            <div className="space-y-2">
               <div className="flex justify-between items-center">
                   <Label>大小 ({store.icon.size}px)</Label>
                   <ResetButton onClick={() => store.updateIcon({ size: 120 })} />
               </div>
               <Slider 
                 value={[store.icon.size]} 
                 min={20} 
                 max={2500} 
                 step={5} 
                 onValueChange={(v) => store.updateIcon({ size: v[0] })} 
               />
            </div>

            <div className="space-y-2">
               <div className="flex justify-between items-center">
                   <Label>旋转 ({store.icon.rotation}°)</Label>
                   <ResetButton onClick={() => store.updateIcon({ rotation: 0 })} />
               </div>
               <Slider 
                 value={[store.icon.rotation]} 
                 min={0} 
                 max={360} 
                 step={1} 
                 onValueChange={(v) => store.updateIcon({ rotation: v[0] })} 
               />
            </div>

            <div className="flex items-center justify-between">
               <Label>图标着色</Label>
               <ColorPicker color={store.icon.color} onChange={(c) => store.updateIcon({ color: c })} />
            </div>

             <div className="flex items-center justify-between">
              <Label htmlFor="icon-shadow">阴影</Label>
              <Switch 
                id="icon-shadow" 
                checked={store.icon.shadow} 
                onCheckedChange={(c) => store.updateIcon({ shadow: c })} 
              />
            </div>

            {store.icon.shadow && (
                <div className="space-y-2 p-3 bg-muted/30 rounded-lg border">
                    <div className="flex items-center justify-between">
                       <Label className="text-xs">阴影颜色</Label>
                       <ColorPicker color={store.icon.shadowColor} onChange={(c) => store.updateIcon({ shadowColor: c })} />
                    </div>
                    
                    <div className="space-y-1">
                        <div className="flex justify-between items-center">
                            <Label className="text-xs">模糊 ({store.icon.shadowBlur}px)</Label>
                            <ResetButton onClick={() => store.updateIcon({ shadowBlur: 6 })} />
                        </div>
                        <Slider 
                            value={[store.icon.shadowBlur]} 
                            min={0} 
                            max={100} 
                            step={1} 
                            onValueChange={(v) => store.updateIcon({ shadowBlur: v[0] })} 
                        />
                    </div>

                    <div className="space-y-1">
                        <div className="flex justify-between items-center">
                            <Label className="text-xs">垂直偏移 ({store.icon.shadowOffsetY}px)</Label>
                            <ResetButton onClick={() => store.updateIcon({ shadowOffsetY: 4 })} />
                        </div>
                        <Slider 
                            value={[store.icon.shadowOffsetY]} 
                            min={-50} 
                            max={50} 
                            step={1} 
                            onValueChange={(v) => store.updateIcon({ shadowOffsetY: v[0] })} 
                        />
                    </div>
                </div>
            )}

            <Separator className="my-2"/>
            
            <div className="space-y-2">
                <Label>图标容器形状</Label>
                <Select value={store.icon.bgShape} onValueChange={(v) => store.updateIcon({ bgShape: v as any })}>
                    <SelectTrigger>
                        <SelectValue placeholder="容器形状" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">无</SelectItem>
                        <SelectItem value="circle">圆形</SelectItem>
                        <SelectItem value="square">方形</SelectItem>
                        <SelectItem value="rounded-square">圆角矩形</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {store.icon.bgShape !== 'none' && (
                <>
                    <div className="flex items-center justify-between">
                        <Label>容器颜色</Label>
                        <ColorPicker color={store.icon.bgColor} onChange={(c) => store.updateIcon({ bgColor: c })} />
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label>内边距 ({store.icon.padding}px)</Label>
                            <ResetButton onClick={() => store.updateIcon({ padding: 40 })} />
                        </div>
                        <Slider 
                            value={[store.icon.padding]} 
                            min={0} 
                            max={100} 
                            step={5} 
                            onValueChange={(v) => store.updateIcon({ padding: v[0] })} 
                        />
                    </div>
                    {store.icon.bgShape === 'rounded-square' && (
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <Label>容器圆角 ({store.icon.radius}px)</Label>
                                <ResetButton onClick={() => store.updateIcon({ radius: 40 })} />
                            </div>
                            <Slider 
                                value={[store.icon.radius]} 
                                min={0} 
                                max={200} 
                                step={5} 
                                onValueChange={(v) => store.updateIcon({ radius: v[0] })} 
                            />
                        </div>
                    )}
                    
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label>容器透明度 ({(store.icon.bgOpacity * 100).toFixed(0)}%)</Label>
                            <ResetButton onClick={() => store.updateIcon({ bgOpacity: 1 })} />
                        </div>
                        <Slider 
                            value={[store.icon.bgOpacity]} 
                            min={0} 
                            max={1} 
                            step={0.01} 
                            onValueChange={(v) => store.updateIcon({ bgOpacity: v[0] })} 
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label>容器模糊 ({(store.icon.bgBlur)}px)</Label>
                            <ResetButton onClick={() => store.updateIcon({ bgBlur: 0 })} />
                        </div>
                        <Slider 
                            value={[store.icon.bgBlur]} 
                            min={0} 
                            max={50} 
                            step={1} 
                            onValueChange={(v) => store.updateIcon({ bgBlur: v[0] })} 
                        />
                    </div>
                </>
            )}
          </section>

          <Separator />

          {/* Background Section */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">背景设置</h3>
            
            <Tabs defaultValue={store.background.type} onValueChange={(v) => store.updateBackground({ type: v as 'solid' | 'image' })}>
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="solid">纯色背景</TabsTrigger>
                    <TabsTrigger value="image">图片背景</TabsTrigger>
                </TabsList>
                
                <TabsContent value="solid" className="space-y-2 mt-2">
                    <div className="flex items-center justify-between">
                        <Label>颜色</Label>
                        <ColorPicker color={store.background.color} onChange={(c) => store.updateBackground({ color: c })} />
                    </div>
                </TabsContent>
                
                <TabsContent value="image" className="space-y-2 mt-2">
                     <Input type="file" accept="image/*" onChange={handleImageUpload} />
                     
                     <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label>高斯模糊 ({store.background.blur}px)</Label>
                            <ResetButton onClick={() => store.updateBackground({ blur: 0 })} />
                        </div>
                        <Slider 
                            value={[store.background.blur]} 
                            min={0} 
                            max={50} 
                            step={1} 
                            onValueChange={(v) => store.updateBackground({ blur: v[0] })} 
                        />
                    </div>
                    
                    <div className="space-y-2 pt-2 border-t">
                        <div className="flex items-center justify-between gap-1 flex-wrap">
                            <Label className="text-xs font-semibold text-muted-foreground w-full mb-1">图片变换</Label>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-7 text-xs flex-1"
                                onClick={() => handleFit('contain')}
                            >
                                <Maximize className="w-3 h-3 mr-1" />
                                适应
                            </Button>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-7 text-xs flex-1"
                                onClick={() => handleFit('cover')}
                            >
                                <Maximize className="w-3 h-3 mr-1 rotate-90" />
                                铺满
                            </Button>
                        </div>
                        
                        <div className="space-y-1">
                            <div className="flex justify-between items-center">
                                <Label className="text-xs">缩放 ({store.background.scale.toFixed(1)}x)</Label>
                                <ResetButton onClick={() => store.updateBackground({ scale: 1 })} />
                            </div>
                            <Slider 
                                value={[store.background.scale]} 
                                min={0.1} 
                                max={10} 
                                step={0.1} 
                                onValueChange={(v) => store.updateBackground({ scale: v[0] })} 
                            />
                        </div>

                        <div className="space-y-1">
                            <div className="flex justify-between items-center">
                                <Label className="text-xs">水平位置 ({store.background.positionX}%)</Label>
                                <ResetButton onClick={() => store.updateBackground({ positionX: 50 })} />
                            </div>
                            <Slider 
                                value={[store.background.positionX]} 
                                min={-500} 
                                max={500} 
                                step={1} 
                                onValueChange={(v) => store.updateBackground({ positionX: v[0] })} 
                            />
                        </div>

                        <div className="space-y-1">
                            <div className="flex justify-between items-center">
                                <Label className="text-xs">垂直位置 ({store.background.positionY}%)</Label>
                                <ResetButton onClick={() => store.updateBackground({ positionY: 50 })} />
                            </div>
                            <Slider 
                                value={[store.background.positionY]} 
                                min={-500} 
                                max={500} 
                                step={1} 
                                onValueChange={(v) => store.updateBackground({ positionY: v[0] })} 
                            />
                        </div>

                        <div className="space-y-1">
                            <div className="flex justify-between items-center">
                                <Label className="text-xs">旋转 ({store.background.rotation}°)</Label>
                                <ResetButton onClick={() => store.updateBackground({ rotation: 0 })} />
                            </div>
                            <Slider 
                                value={[store.background.rotation]} 
                                min={0} 
                                max={360} 
                                step={1} 
                                onValueChange={(v) => store.updateBackground({ rotation: v[0] })} 
                            />
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            <div className="flex items-center justify-between mt-2">
              <Label htmlFor="bg-shadow">背景阴影</Label>
              <Switch 
                id="bg-shadow" 
                checked={store.background.shadow} 
                onCheckedChange={(c) => store.updateBackground({ shadow: c })} 
              />
            </div>

            {store.background.shadow && (
                <div className="space-y-2 p-3 bg-muted/30 rounded-lg border mt-2">
                    <div className="flex items-center justify-between">
                       <Label className="text-xs">阴影颜色</Label>
                       <ColorPicker color={store.background.shadowColor} onChange={(c) => store.updateBackground({ shadowColor: c })} />
                    </div>
                    
                    <div className="space-y-1">
                        <div className="flex justify-between items-center">
                            <Label className="text-xs">模糊 ({store.background.shadowBlur}px)</Label>
                            <ResetButton onClick={() => store.updateBackground({ shadowBlur: 30 })} />
                        </div>
                        <Slider 
                            value={[store.background.shadowBlur]} 
                            min={0} 
                            max={200} 
                            step={1} 
                            onValueChange={(v) => store.updateBackground({ shadowBlur: v[0] })} 
                        />
                    </div>

                    <div className="space-y-1">
                        <div className="flex justify-between items-center">
                            <Label className="text-xs">垂直偏移 ({store.background.shadowOffsetY}px)</Label>
                            <ResetButton onClick={() => store.updateBackground({ shadowOffsetY: 10 })} />
                        </div>
                        <Slider 
                            value={[store.background.shadowOffsetY]} 
                            min={-100} 
                            max={100} 
                            step={1} 
                            onValueChange={(v) => store.updateBackground({ shadowOffsetY: v[0] })} 
                        />
                    </div>
                </div>
            )}
          </section>

        </div>
      </ScrollArea>
      </div>

      <div className="p-4 border-t bg-gray-50 dark:bg-gray-950 space-y-4">
         <Button className="w-full" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            导出封面图
         </Button>
         
         <div className="text-center text-xs text-muted-foreground">
            <a href="https://github.com/afoim/easy_cover" target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center justify-center gap-1">
                <Github className="w-4 h-4" />
                GitHub 开源仓库
            </a>
         </div>
      </div>
    </div>
  );
}

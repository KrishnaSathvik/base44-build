import { act,fireEvent,render,screen } from '@testing-library/react';
import { expect,test,vi } from 'vitest';
let refresh:()=>void=()=>undefined;const update=vi.fn(()=>Promise.resolve());
vi.mock('virtual:pwa-register',()=>({registerSW:(options:{onNeedRefresh:()=>void})=>{refresh=options.onNeedRefresh;return update;}}));
import { PwaUpdatePrompt } from '@/app/PwaUpdatePrompt';
test('VensaOS update prompt is restrained, accessible, and deferrable',()=>{render(<PwaUpdatePrompt/>);act(()=>refresh());expect(screen.getByRole('dialog',{name:'A new version of VensaOS is ready.'})).toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Later'}));expect(screen.queryByRole('dialog')).not.toBeInTheDocument();});

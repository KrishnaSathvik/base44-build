import { expect, test } from 'vitest';
import { pwaManifest } from '@/lib/pwaManifest';
test('manifest has the approved VensaOS install identity and icons',()=>{expect(pwaManifest).toMatchObject({name:'VensaOS',short_name:'VensaOS',display:'standalone',start_url:'/',scope:'/',theme_color:'#F6F5F1',background_color:'#F6F5F1'});expect(pwaManifest.icons.map(icon=>icon.src)).toContain('/icon-192.png');expect(pwaManifest.icons.map(icon=>icon.src)).toContain('/icon-512.png');});

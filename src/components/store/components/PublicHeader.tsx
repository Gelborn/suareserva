import React from 'react';
import { ExternalLink, Instagram, Link2, MapPin } from 'lucide-react';

const PublicHeader: React.FC<{
  name: string;
  address?: string;
  slug?: string;
  primary: string;
  secondary: string;
  logoUrl?: string | null;
  instagram?: string;
  tiktok?: string;
}> = ({ name, address, slug, primary, secondary, logoUrl, instagram, tiktok }) => {
  const initials = (name || 'SR').split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase();

  return (
    <div style={{ ['--sr-primary' as any]: primary, ['--sr-secondary' as any]: secondary }}>
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-[var(--sr-secondary)]/80 text-white grid place-items-center overflow-hidden">
          {logoUrl ? <img src={logoUrl} className="w-full h-full object-cover" /> : <span className="font-semibold">{initials}</span>}
        </div>
        <div>
          <div className="text-xl font-semibold">{name || 'Sua Loja'}</div>
          {address && (
            <div className="text-sm text-gray-600 flex items-center gap-1">
              <MapPin className="w-4 h-4 text-gray-400" /> {address}
            </div>
          )}
          {slug && (
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <ExternalLink className="w-3.5 h-3.5" /> suareserva.online/{slug}
            </div>
          )}
        </div>
      </div>

      {(instagram || tiktok) && (
        <div className="mt-3 flex items-center gap-3 text-sm">
          {instagram && (
            <a className="inline-flex items-center gap-1 text-pink-600 hover:underline" href={instagram} target="_blank" rel="noreferrer">
              <Instagram className="w-4 h-4" /> Instagram
            </a>
          )}
          {tiktok && (
            <a className="inline-flex items-center gap-1 hover:underline" href={tiktok} target="_blank" rel="noreferrer">
              <Link2 className="w-4 h-4" /> TikTok
            </a>
          )}
        </div>
      )}
    </div>
  );
};

export default PublicHeader;

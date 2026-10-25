'use client';
import { useState } from 'react';
import { Dices } from 'lucide-react';
export function Cover({
  title,
  url,
  large = false,
}: {
  title: string;
  url?: string;
  large?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const hue = Array.from(title).reduce((n, c) => n + c.codePointAt(0)!, 0) % 5;
  return (
    <div className={`cover cover-${hue} ${large ? 'cover-large' : ''}`}>
      {url && !failed ? (
        <img
          src={url}
          alt={`${title} box cover`}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="cover-placeholder" role="img" aria-label={`${title} — cover not recorded`}>
          <span className="cover-rule" />
          <Dices size={large ? 48 : 32} strokeWidth={1} />
          <strong>{title}</strong>
          <span className="cover-small">{failed ? 'IMAGE UNAVAILABLE' : 'COVER NOT RECORDED'}</span>
          <span className="cover-rule" />
        </div>
      )}
    </div>
  );
}
export function ShelfIllustration() {
  return (
    <div className="shelf-illustration" aria-hidden="true">
      <div className="little-star">✧</div>
      <div className="box box-one">
        <span>
          ONE MORE
          <br />
          ROUND
        </span>
        <i>✦</i>
      </div>
      <div className="box box-two">
        <span>
          THE
          <br />
          GOOD
          <br />
          COMPANY
        </span>
      </div>
      <div className="box box-three">
        <span>LET’S PLAY</span>
        <i>◈</i>
      </div>
      <div className="wood-shelf" />
    </div>
  );
}

/* מפתח מאיר: מסמן כפתור שמפעיל את מפתחות Claude ו-fal (פעולה שעולה כסף). החריגה היחידה מכלל "בלי אייקונים", לבקשת ענת. */
export default function KeyMark() {
  return (
    <span className="key-mark" title="מפעיל את מפתחות Claude ו-fal" aria-label="מפעיל את מפתחות Claude ו-fal" role="img">
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <circle cx="7.5" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="2.2" />
        <path d="M11.7 12H21M17.5 12v3.4M20.5 12v2.6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    </span>
  );
}

import {
  BriefcaseBusinessIcon,
  Calendar,
  Code2Icon,
  LayoutDashboard,
  List,
  Puzzle,
  Settings,
  TargetIcon,
  User2Icon,
  WalletCards,
} from "lucide-react";

export const SideBarOption = [
  {
    name: "Dashboard",
    icon: LayoutDashboard,
    path: "/dashboard",
  },
  {
    name: "communication",
    icon: User2Icon,
    path: "/communication"
  },
  {
    name: "candidates details",
    icon: Calendar,
    path: "/scheduled-interview",
  },
  {
    name: "All Interview",
    icon: List,
    path: "/all-interview",
  },
  {
    name: "Billing",
    icon: WalletCards,
    path: "/billing",
  },
  {
    name: "Settings",
    icon: Settings,
    path: "/settings",
  },
  {
    name: "About Us",
    icon: BriefcaseBusinessIcon,
    path: "/about"
  },
  

];

export const InterviewType = [
  {
    title: "Technical",
    icon: Code2Icon,
  },
  {
    title: "Behavioral",
    icon: User2Icon,
  },
  {
    title: "Experience",
    icon: BriefcaseBusinessIcon,
  },
  {
    title: "Problem Solving",
    icon: Puzzle,
  },
  {
    title: "Leadership",
    icon: TargetIcon,
  },
];

export const QUESTIONS_PROMPT = `You are an expert technical interviewer.
Based on the following inputs, generate a well-structured list of high-quality interview questions:
Job Title: {{jobTitle}}
Job Description: {{jobDescription}}
Interview Duration: {{duration}}
Interview Type: {{type}}
📌 Your task:
Analyze the job description to identify key responsibilities, required skills, and expected experience.
Generate a list of interview questions depends on interview duration
Adjust the number and depth of questions to match the interview duration.
Ensure the questions match the tone and structure of a real-life {{type}} interview.
🌼 Format your response in JSON format with array list of questions.
format: interviewQuestions=[
{
  question:"",
  type:'Technical/Behavioral/Experince/Problem Solving/Leadership'
},{ 
  ...
}]
🎯 The goal is to create a structured, relevant, and time-optimized interview plan for a {{jobTitle}} role.`;
export const FEEDBACK_PROMPT = `
{{conversation}}

Based on the interview conversation above, evaluate the candidate.

IMPORTANT INSTRUCTIONS:
- ALWAYS write the feedback in English only.
- NEVER use Urdu, Hindi, Arabic, or any other language.
- Even if the interview was conducted in another language, the output MUST be entirely in English.
- Return ONLY valid JSON.
- Do not include markdown or code fences.
- The summary should contain exactly 3 concise English sentences.
- recommendation should be either "Yes" or "No".
- recommendationMsg should be exactly one English sentence.

Return JSON in this format:

{
  "feedback": {
    "rating": {
      "technicalSkills": 5,
      "communication": 6,
      "problemSolving": 4,
      "experience": 7
    },
    "summary": "<3 English sentences>",
    "recommendation": "Yes",
    "recommendationMsg": "<1 English sentence>"
  }
}
`;




/* ─────────────────────────────────────────────
   Inject keyframes once at module level
───────────────────────────────────────────── */
export const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

  @keyframes orb-drift-1 {
    0%,100% { transform: translate(0,0) scale(1); }
    33%      { transform: translate(60px,-40px) scale(1.15); }
    66%      { transform: translate(-30px,50px) scale(0.9); }
  }
  @keyframes orb-drift-2 {
    0%,100% { transform: translate(0,0) scale(1); }
    40%     { transform: translate(-80px,30px) scale(1.2); }
    70%     { transform: translate(50px,-60px) scale(0.85); }
  }
  @keyframes orb-drift-3 {
    0%,100% { transform: translate(0,0) scale(1); }
    50%     { transform: translate(40px,70px) scale(1.1); }
  }
  @keyframes grid-fade {
    0%,100% { opacity: .03; }
    50%     { opacity: .07; }
  }
  @keyframes header-in {
    from { opacity:0; transform: translateY(-20px); }
    to   { opacity:1; transform: translateY(0); }
  }
  @keyframes main-in {
    from { opacity:0; transform: translateY(24px) scale(.97); }
    to   { opacity:1; transform: translateY(0) scale(1); }
  }
  @keyframes footer-in {
    from { opacity:0; transform: translateY(20px); }
    to   { opacity:1; transform: translateY(0); }
  }
  @keyframes dot-pulse {
    0%,100% { opacity:1; transform:scale(1); }
    50%     { opacity:.4; transform:scale(.6); }
  }
  @keyframes scan-line {
    0%   { top: 0%; opacity:.6; }
    100% { top: 100%; opacity:0; }
  }
  @keyframes badge-glow {
    0%,100% { box-shadow: 0 0 8px rgba(34,197,94,.3); }
    50%     { box-shadow: 0 0 20px rgba(34,197,94,.6); }
  }

  .header-anim  { animation: header-in .6s cubic-bezier(.16,1,.3,1) both; }
  .main-anim    { animation: main-in .8s cubic-bezier(.16,1,.3,1) .15s both; }
  .footer-anim  { animation: footer-in .6s cubic-bezier(.16,1,.3,1) .3s both; }

  .orb-1 { animation: orb-drift-1 18s ease-in-out infinite; }
  .orb-2 { animation: orb-drift-2 22s ease-in-out infinite; }
  .orb-3 { animation: orb-drift-3 14s ease-in-out infinite; }
  .grid-pulse { animation: grid-fade 8s ease-in-out infinite; }

  .live-dot span {
    width:6px; height:6px; border-radius:50%; background:#22c55e; display:inline-block;
  }
  .live-dot span:nth-child(1){ animation: dot-pulse 1.2s ease-in-out infinite; }
  .live-dot span:nth-child(2){ animation: dot-pulse 1.2s ease-in-out .2s infinite; }
  .live-dot span:nth-child(3){ animation: dot-pulse 1.2s ease-in-out .4s infinite; }

  .scan-wrap { position:relative; overflow:hidden; }
  .scan-wrap::after {
    content:''; position:absolute; left:0; right:0; height:1px;
    background: linear-gradient(90deg, transparent, rgba(99,179,237,.5), transparent);
    animation: scan-line 4s linear infinite;
  }

  .badge-live { animation: badge-glow 2s ease-in-out infinite; }

  .glass-panel {
    background: rgba(255,255,255,.04);
    border: 1px solid rgba(255,255,255,.08);
    backdrop-filter: blur(20px);
  }
  .glass-panel-dark {
    background: rgba(0,0,0,.25);
    border: 1px solid rgba(255,255,255,.06);
    backdrop-filter: blur(24px);
  }
`;



export const STYLESs = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap');

  @keyframes ring-pulse {
    0%,100% { transform: scale(1);   opacity: .6; }
    50%      { transform: scale(1.18); opacity: 0; }
  }
  @keyframes ring-pulse-2 {
    0%,100% { transform: scale(1);   opacity: .4; }
    50%      { transform: scale(1.3); opacity: 0; }
  }
  @keyframes avatar-glow {
    0%,100% { box-shadow: 0 0 24px rgba(37,99,235,.35), 0 0 0 1px rgba(96,165,250,.2); }
    50%      { box-shadow: 0 0 48px rgba(37,99,235,.65), 0 0 0 1px rgba(96,165,250,.45); }
  }
  @keyframes user-glow {
    0%,100% { box-shadow: 0 0 20px rgba(99,102,241,.25); }
    50%      { box-shadow: 0 0 40px rgba(99,102,241,.5); }
  }
  @keyframes thinking-dot {
    0%,80%,100% { transform: scale(0); opacity:0; }
    40%          { transform: scale(1); opacity:1; }
  }
  @keyframes wave-bar {
    0%,100% { transform: scaleY(.3); }
    50%      { transform: scaleY(1); }
  }
  @keyframes card-in-left {
    from { opacity:0; transform: translateX(-28px) scale(.96); }
    to   { opacity:1; transform: translateX(0) scale(1); }
  }
  @keyframes card-in-right {
    from { opacity:0; transform: translateX(28px) scale(.96); }
    to   { opacity:1; transform: translateX(0) scale(1); }
  }
  @keyframes float {
    0%,100% { transform: translateY(0px); }
    50%      { transform: translateY(-6px); }
  }
  @keyframes scan-h {
    0%   { top:0%;    opacity:.5; }
    100% { top:100%;  opacity:0;  }
  }
  @keyframes status-in {
    from { opacity:0; transform:translateY(8px); }
    to   { opacity:1; transform:translateY(0); }
  }

  .card-left  { animation: card-in-left  .7s cubic-bezier(.16,1,.3,1) .1s both; }
  .card-right { animation: card-in-right .7s cubic-bezier(.16,1,.3,1) .2s both; }
  .float-anim { animation: float 4s ease-in-out infinite; }

  .ring-1-anim { animation: ring-pulse   2s ease-in-out infinite; }
  .ring-2-anim { animation: ring-pulse-2 2s ease-in-out .4s infinite; }
  .ai-glow     { animation: avatar-glow  2.5s ease-in-out infinite; }
  .user-glow   { animation: user-glow    3s ease-in-out infinite; }

  .thinking-dot { animation: thinking-dot 1.4s ease-in-out infinite; }
  .thinking-dot:nth-child(2) { animation-delay:.2s; }
  .thinking-dot:nth-child(3) { animation-delay:.4s; }

  .wave-bar { animation: wave-bar .8s ease-in-out infinite; transform-origin: bottom; }
  .wave-bar:nth-child(2){ animation-delay:.1s; }
  .wave-bar:nth-child(3){ animation-delay:.2s; }
  .wave-bar:nth-child(4){ animation-delay:.3s; }
  .wave-bar:nth-child(5){ animation-delay:.15s; }

  .scan-h {
    position:absolute; left:0; right:0; height:1px;
    background: linear-gradient(90deg, transparent, rgba(96,165,250,.4), transparent);
    animation: scan-h 3.5s linear infinite;
  }
  .status-badge { animation: status-in .4s ease both; }
`;




export const STYLEScontrols = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500&display=swap');

  @keyframes bar-wave {
    0%,100% { transform: scaleY(.25); opacity:.5; }
    50%      { transform: scaleY(1);   opacity:1;  }
  }
  @keyframes end-pulse {
    0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,.4); }
    50%      { box-shadow: 0 0 0 10px rgba(239,68,68,0); }
  }
  @keyframes controls-in {
    from { opacity:0; transform:translateY(14px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes ping-dot {
    0%    { transform:scale(1);   opacity:1; }
    75%,100% { transform:scale(2); opacity:0; }
  }
  @keyframes loader-spin {
    to { transform: rotate(360deg); }
  }

  .controls-in  { animation: controls-in .5s cubic-bezier(.16,1,.3,1) both; }
  .end-btn-idle { animation: end-pulse 2.5s ease-in-out infinite; }

  .wbar { transform-origin: bottom; }
  .wbar-active { animation: bar-wave .7s ease-in-out infinite; }

  .ping-dot::after {
    content:''; position:absolute; inset:0; border-radius:9999px;
    background:inherit; animation: ping-dot 1.2s ease-out infinite;
  }
`;
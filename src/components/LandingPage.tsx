// import { useState } from 'react';
// import { Sparkles, Shield, Zap } from 'lucide-react';
// import { useApp } from '../context/AppContext';

// export default function LandingPage() {
//   const { setCurrentPage } = useApp();
//   const [isYearly, setIsYearly] = useState(false);

//   const pricing = {
//     free: { monthly: 0, yearly: 0 },
//     pro: { monthly: 499, yearly: 399 },
//     premium: { monthly: 999, yearly: 799 },
//   };

//   const toggleBilling = () => setIsYearly(!isYearly);

//   return (
//     <div className="min-h-screen bg-white">
//       {/* Navbar */}
//       <nav className="border-b border-gray-200">
//         <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
//           <div className="flex items-center space-x-2">
//             <Sparkles className="w-6 h-6 text-blue-500" />
//             <span className="text-xl font-semibold text-slate-900">FinTech Analyzer</span>
//           </div>
//           <div className="flex items-center space-x-6">
//             <button className="text-slate-600 hover:text-slate-900 transition-colors">Docs</button>
//             <button className="text-slate-600 hover:text-slate-900 transition-colors">About</button>
//             <button className="text-slate-600 hover:text-slate-900 transition-colors">Pricing</button>
//             <button className="text-slate-600 hover:text-slate-900 transition-colors">Contact</button>
//           </div>
//         </div>
//       </nav>

//       {/* Hero */}
//       <div className="max-w-7xl mx-auto px-6 py-20 text-center">
//         <h1 className="text-5xl md:text-6xl font-bold mb-6 text-slate-900 animate-slide-up">
//           AI-Powered FinTech Code<br />Compliance & Risk Analyzer
//         </h1>
//         <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto animate-slide-up-delay">
//           Scan → Score → Fix your fintech codebase in minutes. Ensure compliance, security, and quality with intelligent analysis.
//         </p>
//         <div className="flex items-center justify-center space-x-4 animate-slide-up-delay-2">
//           <button
//             onClick={() => setCurrentPage('upload')}
//             className="bg-slate-900 text-white px-8 py-4 rounded-xl font-semibold hover:bg-slate-800 transition-all hover:shadow-lg hover:-translate-y-0.5"
//           >
//             Analyze a Repo
//           </button>
//           <button
//             onClick={() => setCurrentPage('history')}
//             className="bg-white text-slate-900 px-8 py-4 rounded-xl font-semibold border-2 border-slate-200 hover:border-slate-300 transition-all hover:shadow-lg hover:-translate-y-0.5"
//           >
//             View History
//           </button>
//         </div>
//       </div>

//       {/* Features */}
//       <div className="grid md:grid-cols-3 gap-8 mb-20 max-w-7xl mx-auto px-6">
//         <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 animate-fade-in-up">
//           <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
//             <Sparkles className="w-6 h-6 text-blue-600" />
//           </div>
//           <h3 className="text-xl font-semibold text-slate-900 mb-3">Agentic Analysis</h3>
//           <p className="text-slate-600 leading-relaxed">
//             Six specialized AI agents analyze your code from understanding to recommendations, ensuring comprehensive coverage.
//           </p>
//         </div>

//         <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 animate-fade-in-up-delay">
//           <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-4">
//             <Shield className="w-6 h-6 text-amber-600" />
//           </div>
//           <h3 className="text-xl font-semibold text-slate-900 mb-3">Compliance + Security Scoring</h3>
//           <p className="text-slate-600 leading-relaxed">
//             Get instant scores for RBI, PCI-DSS, KYC, GDPR compliance plus vulnerability detection and secret scanning.
//           </p>
//         </div>

//         <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 animate-fade-in-up-delay-2">
//           <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
//             <Zap className="w-6 h-6 text-green-600" />
//           </div>
//           <h3 className="text-xl font-semibold text-slate-900 mb-3">Auto-Fixes + Recommendations</h3>
//           <p className="text-slate-600 leading-relaxed">
//             Receive prioritized recommendations with automated fixes and clear timelines from 7 to 90 days.
//           </p>
//         </div>
//       </div>

//       {/* Pricing */}
//       <div className="py-24 border-t border-gray-200">
//         <h2 className="text-4xl font-bold text-center mb-6">Simple & Transparent Pricing</h2>

//         {/* Toggle */}
//         <div className="flex justify-center items-center mb-12 space-x-4">
//           <span className={`font-semibold ${!isYearly ? 'text-slate-900' : 'text-slate-500'}`}>Monthly</span>
//           <button
//             onClick={toggleBilling}
//             className={`relative inline-flex items-center h-6 w-12 rounded-full transition-colors ${isYearly ? 'bg-blue-600' : 'bg-gray-300'}`}
//           >
//             <span
//               className={`inline-block w-6 h-6 bg-white rounded-full shadow transform transition-transform ${isYearly ? 'translate-x-6' : 'translate-x-0'}`}
//             />
//           </button>
//           <span className={`font-semibold ${isYearly ? 'text-slate-900' : 'text-slate-500'}`}>Yearly</span>
//         </div>

//         <div className="grid md:grid-cols-3 gap-10 max-w-6xl mx-auto px-6">
//           {/* Free */}
//           <div className="p-8 border rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all animate-fade-in-up">
//             <h3 className="text-2xl font-semibold text-slate-900 mb-2">Free</h3>
//             <p className="text-slate-600 mb-4">For students & small projects.</p>
//             <div className="text-4xl font-bold text-slate-900 mb-6">
//               ₹{isYearly ? pricing.free.yearly : pricing.free.monthly}
//               <span className="text-lg font-normal">/{isYearly ? 'yr' : 'mo'}</span>
//             </div>
//             <ul className="text-slate-600 space-y-2 mb-6">
//               <li>✔ 1 Repo per Month</li>
//               <li>✔ Basic Score Report</li>
//               <li>✔ Limited Compliance Checks</li>
//               <li>✖ No Auto-Fixes</li>
//             </ul>
//             <button className="w-full bg-slate-900 text-white py-3 rounded-xl font-semibold hover:bg-slate-800 transition-all">Start Free</button>
//           </div>

//           {/* Pro */}
//           <div className="relative p-8 border-2 border-blue-500 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all bg-blue-50 animate-fade-in-up-delay">
//             {/* Ribbon */}
//             <div className="absolute -top-3 right-0 bg-blue-600 text-white text-xs px-3 py-1 rounded-bl-lg font-semibold">Most Popular</div>

//             <h3 className="text-2xl font-semibold text-slate-900 mb-2">Pro</h3>
//             <p className="text-slate-700 mb-4">Best for professionals.</p>
//             <div className="text-4xl font-bold text-slate-900 mb-6">
//               ₹{isYearly ? pricing.pro.yearly : pricing.pro.monthly}
//               <span className="text-lg font-normal">/{isYearly ? 'yr' : 'mo'}</span>
//             </div>
//             <ul className="text-slate-700 space-y-2 mb-6">
//               <li>✔ 20 Repos / Month</li>
//               <li>✔ Full Compliance Report</li>
//               <li>✔ Vulnerability Scan</li>
//               <li>✔ Priority Recommendations</li>
//               <li>✖ No Auto-Fixes</li>
//             </ul>
//             <button className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all">Upgrade to Pro</button>
//           </div>

//           {/* Premium */}
//           <div className="p-8 border rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all animate-fade-in-up-delay-2">
//             <h3 className="text-2xl font-semibold text-slate-900 mb-2">Premium</h3>
//             <p className="text-slate-600 mb-4">For companies & teams.</p>
//             <div className="text-4xl font-bold text-slate-900 mb-6">
//               ₹{isYearly ? pricing.premium.yearly : pricing.premium.monthly}
//               <span className="text-lg font-normal">/{isYearly ? 'yr' : 'mo'}</span>
//             </div>
//             <ul className="text-slate-600 space-y-2 mb-6">
//               <li>✔ Unlimited Repos</li>
//               <li>✔ All Compliance Frameworks</li>
//               <li>✔ Auto-Fixes + Patches</li>
//               <li>✔ Team Dashboard</li>
//               <li>✔ 24/7 Priority Support</li>
//             </ul>
//             <button className="w-full bg-slate-900 text-white py-3 rounded-xl font-semibold hover:bg-slate-800 transition-all">Go Premium</button>
//           </div>
//         </div>
//       </div>

//       {/* Footer */}
//       <footer className="border-t border-gray-200 mt-20">
//         <div className="max-w-7xl mx-auto px-6 py-8 flex items-center justify-between text-sm text-slate-600">
//           <div>© 2025 FinTech Analyzer. All rights reserved.</div>
//           <div className="flex items-center space-x-6">
//             <button className="hover:text-slate-900 transition-colors">Docs</button>
//             <button className="hover:text-slate-900 transition-colors">About</button>
//             <button className="hover:text-slate-900 transition-colors">Contact</button>
//           </div>
//         </div>
//       </footer>
//     </div>
//   );
// }



















import { useState } from 'react';
import { Sparkles, Shield, Zap, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import dashimg from '../dashimg.png';

export default function LandingPage() {
  const { setCurrentPage } = useApp();
  const [isYearly, setIsYearly] = useState(false);

  const pricing = {
    free: { monthly: 0, yearly: 0 },
    pro: { monthly: 499, yearly: 399 },
    premium: { monthly: 999, yearly: 799 },
  };

  const toggleBilling = () => setIsYearly(!isYearly);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-100 text-slate-900">
      {/* subtle decorative gradients */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-28 -left-28 w-[460px] h-[460px] bg-gradient-to-tr from-[#dbeafe] to-[#fde68a] opacity-30 blur-3xl rounded-full transform -rotate-12" />
        <div className="absolute -bottom-32 -right-20 w-[480px] h-[480px] bg-gradient-to-tr from-[#fce7f3] to-[#e0f2fe] opacity-20 blur-3xl rounded-full transform rotate-6" />
      </div>

      {/* Navbar */}
      <nav className="sticky top-6 mx-6 bg-white/80 backdrop-blur-md border border-slate-100 rounded-xl shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-tr from-[#60a5fa] to-[#c084fc] text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold">Code Nirikshak</div>
              <div className="text-xs text-slate-500">Automate up to 70% of routine compliance</div>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-6">
            <button className="text-slate-600 hover:text-slate-900 transition">Docs</button>
            <button className="text-slate-600 hover:text-slate-900 transition">About</button>
            <button className="text-slate-600 hover:text-slate-900 transition">Pricing</button>
            <button className="text-slate-600 hover:text-slate-900 transition">Contact</button>
            <button
              onClick={() => setCurrentPage('upload')}
              className="ml-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#60a5fa] to-[#c084fc] text-white font-semibold shadow-md hover:scale-[1.02] transition-transform"
            >
              Start Scan
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7">
            <motion.h1
              initial={{ opacity: 0, x: -18 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight"
            >
              AI-Powered FinTech Code Compliance & Risk Analyzer
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.12 }}
              className="mt-6 text-lg text-slate-700 max-w-2xl"
            >
              Scan → Score → Fix your fintech codebase in minutes. Automate routine audits, reduce cost and time, and let experts focus on complex, high-risk issues.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28 }}
              className="mt-8 flex flex-wrap gap-4"
            >
              <button
                onClick={() => setCurrentPage('upload')}
                className="px-5 py-3 rounded-lg bg-slate-900 text-white font-semibold shadow hover:shadow-lg transform hover:-translate-y-0.5 transition"
              >
                Analyze a Repo
              </button>

              <button
                onClick={() => setCurrentPage('history')}
                className="px-5 py-3 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
              >
                View History
              </button>
            </motion.div>

            <motion.div
              className="mt-8 flex flex-wrap gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45 }}
            >
              <div className="px-3 py-2 bg-white rounded-lg text-sm border">✔ 70% automated checks</div>
              <div className="px-3 py-2 bg-white rounded-lg text-sm border">✔ Enterprise-grade scanning</div>
              <div className="px-3 py-2 bg-white rounded-lg text-sm border">✔ Auto-fix suggestions</div>
            </motion.div>
          </div>

          {/* Right mock + floating cards */}
          <div className="lg:col-span-5 relative">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.18 }}
              className="bg-white rounded-2xl p-6 border shadow-md"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm text-slate-500">Latest Scan</div>
                  <div className="font-semibold text-lg">Repo: payment-service</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500">Overall</div>
                  <div className="text-2xl font-bold text-slate-900">78%</div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-sm flex items-center justify-between text-slate-600">
                  <div>Security</div>
                  <div>82%</div>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-sky-400 w-4/5" />
                </div>

                <div className="text-sm flex items-center justify-between text-slate-600 mt-2">
                  <div>Compliance</div>
                  <div>73%</div>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-2 rounded-full bg-gradient-to-r from-amber-300 to-pink-400 w-3/4" />
                </div>

                <div className="text-sm flex items-center justify-between text-slate-600 mt-2">
                  <div>Quality</div>
                  <div>69%</div>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-2 rounded-full bg-gradient-to-r from-violet-300 to-sky-300 w-2/3" />
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <button className="px-3 py-2 rounded-md bg-gradient-to-r from-[#60a5fa] to-[#c084fc] text-white font-medium">View Report</button>
                <button className="px-3 py-2 rounded-md border text-slate-700">Share</button>
              </div>
            </motion.div>

            {/* Floating micro-card 1 */}
            <motion.div
              className="absolute -top-8 -left-6 w-44 rounded-2xl p-4 bg-white shadow-sm border"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28, type: 'spring', stiffness: 120, damping: 12 }}
            >
              {/* <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-slate-50">
                  <Activity className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <div className="text-xs text-slate-500">Auto-Fix</div>
                  <div className="text-sm font-semibold">Patch Suggestion</div>
                </div>
              </div> */}
            </motion.div>

            {/* Floating micro-card 2 */}
            <motion.div
              className="absolute -bottom-10 -right-6 w-44 rounded-2xl p-4 bg-white shadow-sm border"
              initial={{ opacity: 0, y: -18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.38, type: 'spring', stiffness: 120, damping: 12 }}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-slate-50">
                  <Shield className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <div className="text-xs text-slate-500">Compliance</div>
                  <div className="text-sm font-semibold">RBI / PCI</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </header>

      {/* Agent Workflow (before pricing) */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl p-8 border shadow-sm">
          <h3 className="text-2xl font-bold mb-2">Agent Workflow</h3>
          <p className="text-slate-600 mb-6">
            Our multi-agent pipeline orchestrates parsing, linting, secret scanning, compliance checks, vulnerability analysis and automated patch proposals.
          </p>

          <div className="grid md:grid-cols-3 gap-6 items-center">
              <div className="md:col-span-2">
              <img src={dashimg} alt="Agent workflow diagram" className="w-full rounded-xl border" />
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-slate-50 border">
                <div className="text-sm text-slate-500">1. Ingest</div>
                <div className="font-semibold mt-1">Repo, branches, infra manifests</div>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 border">
                <div className="text-sm text-slate-500">2. Analyze</div>
                <div className="font-semibold mt-1">Language parsing, dependency checks, linters</div>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 border">
                <div className="text-sm text-slate-500">3. Report</div>
                <div className="font-semibold mt-1">Prioritized fixes and compliance score</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature grid + 70% card */}
      <section className="max-w-7xl mx-auto px-6 pb-16">
        <div className="grid md:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="p-6 rounded-2xl bg-white border shadow-sm"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#60a5fa] to-[#c084fc] flex items-center justify-center mb-4 text-white">
              <Sparkles className="w-6 h-6" />
            </div>
            <h4 className="font-semibold text-lg mb-2">Agentic Analysis</h4>
            <p className="text-slate-600">Six specialized agents coordinate to produce deep recommendations across code, infra and configuration.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="p-6 rounded-2xl bg-white border shadow-sm"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#fbbf24] to-[#fb7185] flex items-center justify-center mb-4 text-white">
              <Shield className="w-6 h-6" />
            </div>
            <h4 className="font-semibold text-lg mb-2">Compliance & Security</h4>
            <p className="text-slate-600">RBI, PCI-DSS, KYC and GDPR checks with secret scanning and dependency vulnerability detection.</p>
          </motion.div>

          {/* 70% automation feature card */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="p-6 rounded-2xl bg-gradient-to-r from-[#60a5fa] to-[#c084fc] text-white shadow-md"
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-semibold text-lg">Automate up to 70%</h4>
                <div className="text-sm mt-1 text-white/90">Reduce audit time, cut costs, and let experts focus on high-risk issues.</div>
              </div>
              <div className="px-3 py-2 bg-white/10 rounded-md">
                <div className="text-sm font-bold">70%</div>
              </div>
            </div>

            <ul className="mt-4 space-y-2 text-sm">
              <li>• Routine code & lint checks</li>
              <li>• Secret & dependency scanning</li>
              <li>• Baseline regulatory checks (RBI / PCI / KYC)</li>
              <li>• Auto-fix suggestions (optional)</li>
            </ul>

            <div className="mt-6">
              <button className="px-4 py-2 rounded-md bg-white text-slate-900 font-semibold shadow hover:scale-[1.02] transition">Book a Demo</button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 bg-white border-t">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-6">Simple & Transparent Pricing</h2>

          {/* Toggle */}
          <div className="flex justify-center items-center mb-12 space-x-4">
            <span className={`font-semibold ${!isYearly ? 'text-slate-900' : 'text-slate-500'}`}>Monthly</span>
            <button
              onClick={toggleBilling}
              className={`relative inline-flex items-center h-6 w-12 rounded-full transition-colors ${isYearly ? 'bg-slate-200' : 'bg-slate-100'}`}
            >
              <span
                className={`inline-block w-6 h-6 bg-white rounded-full shadow transform transition-transform ${isYearly ? 'translate-x-6' : 'translate-x-0'}`}
              />
            </button>
            <span className={`font-semibold ${isYearly ? 'text-slate-900' : 'text-slate-500'}`}>Yearly</span>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <motion.div className="p-8 rounded-2xl bg-white border shadow-sm">
              <h3 className="text-2xl font-semibold mb-2">Free</h3>
              <p className="text-slate-600 mb-4">For students & small projects.</p>
              <div className="text-4xl font-bold mb-6">₹{isYearly ? pricing.free.yearly : pricing.free.monthly}<span className="text-lg font-normal">/{isYearly ? 'yr' : 'mo'}</span></div>
              <ul className="text-slate-600 space-y-2 mb-6">
                <li>✔ 1 Repo per Month</li>
                <li>✔ Basic Score Report</li>
                <li>✔ Limited Compliance Checks</li>
                <li>✖ No Auto-Fixes</li>
              </ul>
              <button className="w-full rounded-md py-3 bg-slate-900 text-white font-semibold">Start Free</button>
            </motion.div>

            <motion.div className="relative p-8 rounded-2xl bg-white border shadow-lg">
              <div className="absolute -top-3 right-4 bg-gradient-to-r from-[#60a5fa] to-[#c084fc] text-white text-xs px-3 py-1 rounded-lg font-semibold">Most Popular</div>
              <h3 className="text-2xl font-semibold mb-2">Pro</h3>
              <p className="text-slate-600 mb-4">Best for professionals.</p>
              <div className="text-4xl font-bold mb-6">₹{isYearly ? pricing.pro.yearly : pricing.pro.monthly}<span className="text-lg font-normal">/{isYearly ? 'yr' : 'mo'}</span></div>
              <ul className="text-slate-600 space-y-2 mb-6">
                <li>✔ 20 Repos / Month</li>
                <li>✔ Full Compliance Report</li>
                <li>✔ Vulnerability Scan</li>
                <li>✔ Priority Recommendations</li>
                <li>✖ No Auto-Fixes</li>
              </ul>
              <button className="w-full rounded-md py-3 bg-gradient-to-r from-[#60a5fa] to-[#c084fc] text-white font-semibold">Upgrade to Pro</button>
            </motion.div>

            <motion.div className="p-8 rounded-2xl bg-white border shadow-sm">
              <h3 className="text-2xl font-semibold mb-2">Premium</h3>
              <p className="text-slate-600 mb-4">For companies & teams.</p>
              <div className="text-4xl font-bold mb-6">₹{isYearly ? pricing.premium.yearly : pricing.premium.monthly}<span className="text-lg font-normal">/{isYearly ? 'yr' : 'mo'}</span></div>
              <ul className="text-slate-600 space-y-2 mb-6">
                <li>✔ Unlimited Repos</li>
                <li>✔ All Compliance Frameworks</li>
                <li>✔ Auto-Fixes + Patches</li>
                <li>✔ Team Dashboard</li>
                <li>✔ 24/7 Priority Support</li>
              </ul>
              <button className="w-full rounded-md py-3 bg-slate-900 text-white font-semibold">Go Premium</button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 py-8 flex items-center justify-between text-sm text-slate-600">
          <div>© 2025 Code Nirikshak. All rights reserved.</div>
          <div className="flex items-center gap-6">
            <button className="hover:text-slate-900 transition">Docs</button>
            <button className="hover:text-slate-900 transition">About</button>
            <button className="hover:text-slate-900 transition">Contact</button>
          </div>
        </div>
      </footer>
    </div>
  );
}


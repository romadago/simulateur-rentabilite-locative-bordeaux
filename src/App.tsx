import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// --- Static Data & Configuration ---

const quartierData: { [key: string]: { prixM2: number, zone: number } } = {
    // Quartier: [Prix au m², Zone de Loyer (1-4)]
    'Chartrons': { prixM2: 5500, zone: 2 },
    'Bastide': { prixM2: 4800, zone: 4 },
    'Nansouty': { prixM2: 4700, zone: 3 },
    'Saint-Michel': { prixM2: 4900, zone: 2 },
    'Caudéran': { prixM2: 5200, zone: 3 },
    'Bacalan': { prixM2: 4100, zone: 4 },
    'Hypercentre': { prixM2: 6200, zone: 1 },
    'Saint-Genès': { prixM2: 5100, zone: 3 },
};

const rentData: { [key: string]: { [key: string]: number } } = {
    // Loyers de référence en €/m² pour NON MEUBLÉ
    '1': { '1': 14.3, '2': 12.6, '3': 11.3, '4': 11.0 }, // Zone 1
    '2': { '1': 13.0, '2': 11.4, '3': 10.3, '4': 10.0 }, // Zone 2
    '3': { '1': 12.0, '2': 10.5, '3': 9.7,  '4': 9.4  }, // Zone 3
    '4': { '1': 11.2, '2': 9.8,  '3': 9.0,  '4': 8.7  }, // Zone 4
};

// Surface moyenne par type de bien
const surfaceData: { [key: string]: number } = { 'T1': 25, 'T2': 45, 'T3': 65, 'T4': 85 };

type Scenario = {
    name: string;
    rendement: number;
    loyer?: number;
    prix?: number;
};

// --- Main App Component ---
const App: React.FC = () => {
    // --- State Management ---
    const [typeBien, setTypeBien] = useState('T2');
    const [budget, setBudget] = useState(250000);
    const [quartier1, setQuartier1] = useState('Chartrons');
    const [quartier2, setQuartier2] = useState('Bastide');
    const [email, setEmail] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [emailMessage, setEmailMessage] = useState('');
    
    const [results, setResults] = useState<{ scenarios: Scenario[] }>({
        scenarios: [],
    });

    // --- Calculation Engine ---
    useEffect(() => {
        const calculateScenario = (quartierName: string): Scenario => {
            const data = quartierData[quartierName];
            if (!data) return { name: quartierName, rendement: 0, loyer: 0, prix: 0 };

            const surface = surfaceData[typeBien];
            const prixEstime = data.prixM2 * surface;

            const surfaceAchetable = budget < prixEstime ? budget / data.prixM2 : surface;
            const prixFinal = budget < prixEstime ? budget : prixEstime;

            const typeBienIndex = Object.keys(surfaceData).indexOf(typeBien) + 1;
            const loyerRefM2 = rentData[data.zone.toString()]?.[typeBienIndex.toString()] || 0;
            const loyerAnnuel = loyerRefM2 * surfaceAchetable * 12;
            const rendement = prixFinal > 0 ? (loyerAnnuel / prixFinal) * 100 : 0;

            return { name: quartierName, rendement: isFinite(rendement) ? rendement : 0, loyer: loyerAnnuel / 12, prix: prixFinal };
        };
        
        const scenario1 = calculateScenario(quartier1);
        const scenario2 = calculateScenario(quartier2);
        const scenarioSCPI: Scenario = { name: 'SCPI Diversifiée', rendement: 6.5 };


        setResults({
            scenarios: [scenario1, scenario2, scenarioSCPI]
        });

    }, [typeBien, budget, quartier1, quartier2]);
    
    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !/\S+@\S+\.\S+/.test(email)) {
            setEmailMessage('Veuillez saisir une adresse e-mail valide.');
            return;
        }
        setIsSending(true);
        setEmailMessage('');

        const simulationData = {
            objectifs: {
                typeBien,
                budget: `${budget.toLocaleString('fr-FR')} €`,
            },
            resultats: results.scenarios.map(s => ({
                quartier: s.name,
                rendement: `${s.rendement.toFixed(2)}%`,
                loyer: s.loyer ? `${s.loyer.toFixed(0)} €/mois` : 'N/A',
                prix: s.prix ? `${s.prix.toLocaleString('fr-FR')} €` : 'N/A',
            }))
        };

        try {
            const response = await fetch('/.netlify/functions/send-simulation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, data: simulationData, theme: "Rentabilité Bordeaux" }),
            });
            if (!response.ok) throw new Error("Erreur lors de l'envoi.");

            setEmailMessage(`Votre comparatif a bien été envoyé à ${email}.`);
            setEmail('');
        } catch (error) {
            console.error('Failed to send simulation:', error);
            setEmailMessage("Une erreur est survenue. Veuillez réessayer.");
        } finally {
            setIsSending(false);
            setTimeout(() => setEmailMessage(''), 5000);
        }
    };


    const yAxisDomain: [number, 'auto'] = [
        Math.floor(Math.min(...results.scenarios.map(s => s.rendement)) - 1),
        'auto'
    ];


    return (
        <div className="bg-gradient-to-br from-slate-900 to-slate-700 p-4 sm:p-8 font-sans flex items-center justify-center min-h-screen">
            <div className="bg-slate-800/50 backdrop-blur-sm ring-1 ring-white/10 p-6 sm:p-10 rounded-2xl shadow-2xl w-full max-w-5xl mx-auto">
                
                <div className="text-center mb-10">
                    <img src="/generique-turquoise.svg" alt="Logo Aeternia Patrimoine" className="w-16 h-16 mx-auto mb-4" />
                    <h1 className="text-3xl sm:text-4xl font-bold text-gray-100">Où investir à Bordeaux ?</h1>
                    <p className="text-slate-300 mt-2">Comparez la rentabilité locative des principaux quartiers.</p>
                </div>

                {/* --- Main Controls --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 bg-slate-700/50 p-6 rounded-lg ring-1 ring-white/10">
                    <div>
                        <label htmlFor="typeBien" className="block text-sm font-medium text-gray-300 mb-1">Type de bien</label>
                        <select id="typeBien" value={typeBien} onChange={(e) => setTypeBien(e.target.value)} className="w-full p-3 bg-slate-800 text-white rounded-lg border border-slate-600 focus:ring-2 focus:ring-[#00FFD2] focus:outline-none">
                           {Object.keys(surfaceData).map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="text-gray-300 text-sm font-medium mb-1">
                            <div className="flex justify-between"><span>Votre budget</span> <span className="font-bold text-white">{budget.toLocaleString('fr-FR')} €</span></div>
                        </label>
                        <input type="range" min="100000" max="800000" step="10000" value={budget} onChange={(e) => setBudget(parseFloat(e.target.value))} className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer" />
                    </div>
                </div>

                {/* --- Comparison Section --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    {[0, 1].map((index) => (
                         <div key={index} className="bg-slate-700/50 p-6 rounded-lg shadow-inner ring-1 ring-white/10">
                             <h3 className="text-xl font-semibold text-white mb-4">Comparatif {index + 1}</h3>
                             <select value={index === 0 ? quartier1 : quartier2} onChange={(e) => index === 0 ? setQuartier1(e.target.value) : setQuartier2(e.target.value)} className="w-full p-3 bg-slate-800 text-white rounded-lg border border-slate-600 focus:ring-2 focus:ring-[#00FFD2] focus:outline-none mb-4">
                                {Object.keys(quartierData).map(q => <option key={q} value={q}>{q}</option>)}
                             </select>
                             <div className="space-y-3 text-center">
                                 <div className="bg-slate-800/30 p-4 rounded-lg">
                                     <p className="text-sm font-semibold text-slate-300">Rendement Brut Estimé</p>
                                     <p className="text-2xl font-extrabold text-white">{results.scenarios[index]?.rendement.toFixed(2)}%</p>
                                 </div>
                                 <div className="text-xs text-slate-400 mt-2">
                                     Loyer mensuel estimé: <span className="font-bold">{results.scenarios[index]?.loyer?.toFixed(0)} €</span><br/>
                                     Prix d'achat estimé: <span className="font-bold">{results.scenarios[index]?.prix?.toLocaleString('fr-FR', {maximumFractionDigits: 0})} €</span>
                                 </div>
                             </div>
                         </div>
                    ))}
                </div>

                {/* --- Cheeky SCPI Comparison --- */}
                <div className="mb-8 w-full md:w-2/3 lg:w-1/2 mx-auto">
                    <div className="bg-slate-700/50 p-6 rounded-lg shadow-inner ring-2 ring-[#00FFD2]">
                        <h3 className="text-xl font-semibold text-white mb-4 text-center">Alternative : Notre Solution</h3>
                        <div className="text-center">
                             <div className="bg-[#00FFD2]/10 p-4 rounded-lg">
                                 <p className="text-sm font-semibold text-[#00FFD2]">Rendement Cible en SCPI</p>
                                 <p className="text-2xl font-extrabold text-white">6.50%</p>
                             </div>
                             <p className="text-xs text-slate-400 mt-3">Rendement net de frais de gestion, sans contrainte locative et diversifié sur des dizaines de biens.</p>
                         </div>
                    </div>
                </div>


                {/* Chart Section */}
                <div className="bg-slate-700/50 p-6 rounded-lg shadow-inner ring-1 ring-white/10">
                    <h2 className="text-xl font-semibold text-white mb-4 text-center">Comparatif de Rendement Brut</h2>
                     <div className="w-full h-64">
                        <ResponsiveContainer>
                            <BarChart data={results.scenarios} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                                <XAxis dataKey="name" stroke="#94a3b8" />
                                <YAxis stroke="#94a3b8" unit="%" domain={yAxisDomain} />
                                <Tooltip
                                    cursor={{fill: 'rgba(71, 85, 105, 0.3)'}}
                                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '0.5rem', color: '#fff' }} 
                                    formatter={(value: number) => `${value.toFixed(2)} %`}
                                />
                                <Bar dataKey="rendement" name="Rendement" fill="#00FFD2" barSize={50} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                
                 {/* --- CTAs Section --- */}
                <div className="mt-10 pt-8 border-t border-slate-600">
                     <h3 className="text-lg font-semibold text-gray-100 mb-4 text-center">Passez à l'étape suivante</h3>
                     <form onSubmit={handleEmailSubmit} className="flex flex-col sm:flex-row gap-2 mb-4 max-w-lg mx-auto">
                        <input
                            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                            placeholder="Recevoir le comparatif par e-mail"
                            className="flex-grow bg-slate-800 text-white placeholder-slate-400 border border-slate-600 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-[#00FFD2]"
                            required
                        />
                        <button type="submit" disabled={isSending} className="bg-slate-600 text-white font-bold py-3 px-5 rounded-lg hover:bg-slate-500 transition-colors duration-300 disabled:opacity-50">
                            {isSending ? 'Envoi...' : 'Recevoir'}
                        </button>
                    </form>
                    {emailMessage && <p className="text-sm text-center text-emerald-400 mb-4 h-5">{emailMessage}</p>}

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-6">
                        <a href="https://www.aeterniapatrimoine.fr/solutions/" target="_blank" rel="noopener noreferrer" className="bg-[#00FFD2] text-slate-900 font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-white transition-colors duration-300 w-full sm:w-auto">
                            Découvrir nos solutions
                        </a>
                        <a href="https://www.aeterniapatrimoine.fr/contact/" target="_blank" rel="noopener noreferrer" className="bg-transparent border-2 border-[#00FFD2] text-[#00FFD2] font-bold py-3 px-8 rounded-lg hover:bg-[#00FFD2] hover:text-slate-900 transition-colors duration-300 w-full sm:w-auto">
                            Prendre rendez-vous
                        </a>
                    </div>
                </div>
                
                 <div className="text-center mt-10">
                     <div className="text-xs text-slate-400 p-4 bg-slate-900/50 rounded-lg max-w-3xl mx-auto">
                        <h3 className="font-semibold text-slate-300 mb-2">Avertissement</h3>
                        <p>Ce simulateur fournit une estimation de rendement brut à titre indicatif et non contractuel. Il ne prend pas en compte les frais de notaire, les charges, la fiscalité ou les vacances locatives. Pour une analyse personnalisée, consultez un de nos conseillers.</p>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default App;

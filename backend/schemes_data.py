"""
schemes_data.py — Comprehensive repository of Indian Government Agricultural Schemes
Contains verified, real-time scheme data, benefits, eligibility criteria, and application links.
"""

GOVERNMENT_SCHEMES = [
    {
        "id": "pm-kisan",
        "name": "PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)",
        "short_name": "PM-KISAN",
        "category": "Financial Support",
        "ministry": "Ministry of Agriculture & Farmers Welfare",
        "summary": "Income support of ₹6,000 per year in three equal installments of ₹2,000 directly transferred to bank accounts of landholding farmer families.",
        "benefit": "₹6,000 per annum (Direct Benefit Transfer)",
        "amount": "₹6,000 / year",
        "eligibility": "All landholding farmer families having cultivable land in their names. Excludes institutional landholders and high-income tax-paying professionals.",
        "documents": ["Aadhaar Card", "Land ownership documents (Khatauni/Khasra)", "Bank Account Details (linked to Aadhaar)", "Active Mobile Number"],
        "how_to_apply": "Apply online at the PM-KISAN portal via 'New Farmer Registration' or through Common Service Centers (CSC) / State Agriculture Nodal Officers.",
        "state": "All states",
        "status": "Active · Year-Round",
        "url": "https://pmkisan.gov.in/",
        "icon": "rupee",
        "tags": ["income support", "cash transfer", "pmkisan", "subvention", "small farmers", "direct transfer"],
        "crops": ["All Crops"]
    },
    {
        "id": "pmfby",
        "name": "PMFBY (Pradhan Mantri Fasal Bima Yojana)",
        "short_name": "PMFBY",
        "category": "Crop Insurance",
        "ministry": "Ministry of Agriculture & Farmers Welfare",
        "summary": "Comprehensive crop insurance shield against non-preventable natural risks (drought, flood, pests, storms, post-harvest losses) with lowest farmer premium rates.",
        "benefit": "Full claim compensation; 2% premium for Kharif, 1.5% for Rabi, 5% for horticultural crops",
        "amount": "Coverage up to 100% sum insured",
        "eligibility": "All farmers including sharecroppers and tenant farmers growing notified crops in notified areas are eligible.",
        "documents": ["Land Record (Khasra/Khatauni)", "Sowing Certificate / Patwari report", "Bank Passbook with IFSC", "Aadhaar Card"],
        "how_to_apply": "Apply via national crop insurance portal (pmfby.gov.in), through lending banks, insurance agents, or local CSC centers before cut-off dates.",
        "state": "All states",
        "status": "Active · Season-Wise",
        "url": "https://pmfby.gov.in/",
        "icon": "shield",
        "tags": ["crop insurance", "drought", "flood", "loss compensation", "kharif", "rabi"],
        "crops": ["Paddy", "Wheat", "Maize", "Cotton", "Soybean", "Pulses", "Oilseeds", "Millets", "Sugarcane"]
    },
    {
        "id": "pmksy",
        "name": "PMKSY (Pradhan Mantri Krishi Sinchayee Yojana)",
        "short_name": "PMKSY",
        "category": "Irrigation & Water",
        "ministry": "Ministry of Jal Shakti & Agriculture",
        "summary": "Per Drop More Crop & Har Khet Ko Pani — Subsidies up to 55% for drip and sprinkler micro-irrigation systems to maximize water use efficiency.",
        "benefit": "Up to 55% subsidy for Small & Marginal farmers; 45% for other farmers",
        "amount": "Subsidy up to ₹45,000 - ₹65,000 / hectare",
        "eligibility": "Farmers of all categories possessing land with verified water source (well, borewell, canal). Cooperative societies and self-help groups also eligible.",
        "documents": ["Land Ownership Certificate", "Proof of Water Source", "Soil & Water Test Report", "Bank Passbook", "Aadhaar Card"],
        "how_to_apply": "Submit application through State Agriculture or Horticulture Department portal or District Agriculture Officer.",
        "state": "All states",
        "status": "Active · Applications Open",
        "url": "https://pmksy.gov.in/",
        "icon": "droplet",
        "tags": ["irrigation", "drip irrigation", "sprinkler", "water saving", "borewell", "per drop more crop"],
        "crops": ["Vegetables", "Horticulture", "Cotton", "Sugarcane", "Wheat", "Paddy", "Pulses"]
    },
    {
        "id": "kcc",
        "name": "Kisan Credit Card (KCC) Scheme",
        "short_name": "KCC",
        "category": "Credit & Loans",
        "ministry": "Ministry of Finance & NABARD",
        "summary": "Concessional institutional crop loans up to ₹3 Lakh at an effective interest rate of just 4% with prompt repayment incentive for farming and allied operations.",
        "benefit": "Collateral-free loan up to ₹1.60 Lakh; concessional 4% interest rate up to ₹3 Lakh",
        "amount": "Up to ₹3,00,000 credit limit",
        "eligibility": "Owner cultivators, tenant farmers, oral lessees, sharecroppers, self-help groups (SHGs), and joint liability groups (JLGs).",
        "documents": ["Duly filled KCC application form", "Identity & Address proof (Aadhaar/Voter ID)", "Landholding record certified by Revenue authority", "Crop pattern certificate"],
        "how_to_apply": "Apply through any nationalized, regional rural bank (RRB), cooperative bank, or download simplified one-page KCC form via PM-KISAN portal.",
        "state": "All states",
        "status": "Active · Year-Round",
        "url": "https://www.myscheme.gov.in/schemes/kcc",
        "icon": "credit-card",
        "tags": ["loan", "credit", "kcc", "working capital", "seeds", "fertilizers", "low interest"],
        "crops": ["All Crops", "Dairy", "Poultry", "Fisheries"]
    },
    {
        "id": "pm-kusum",
        "name": "PM-KUSUM (Solar Pumps & Grid Power)",
        "short_name": "PM-KUSUM",
        "category": "Solar & Energy",
        "ministry": "Ministry of New & Renewable Energy",
        "summary": "Subsidies up to 60% for installing standalone solar agriculture pumps and solarizing grid-connected agricultural pumps, turning farmers into energy producers.",
        "benefit": "60% government subsidy (30% Central + 30% State); 30% bank loan; farmer pays only 10%",
        "amount": "Subsidy on solar pumps up to 7.5 HP",
        "eligibility": "Individual farmers, groups of farmers, Water User Associations (WUAs), and farmer producer organizations (FPOs).",
        "documents": ["Aadhaar Card", "Land revenue records (Jamabandi/7/12 extract)", "Bank details", "Electricity connection details (for solarization)"],
        "how_to_apply": "Register on the State Renewable Energy Development Agency (SREDA) portal or official PM-KUSUM state portal.",
        "state": "All states",
        "status": "Active · State Quotas",
        "url": "https://pmkusum.mnre.gov.in/",
        "icon": "sun",
        "tags": ["solar", "solar pump", "energy", "renewable", "electricity", "tubewell"],
        "crops": ["All Crops"]
    },
    {
        "id": "smam",
        "name": "SMAM (Sub-Mission on Agricultural Mechanization)",
        "short_name": "SMAM",
        "category": "Farm Machinery",
        "ministry": "Ministry of Agriculture & Farmers Welfare",
        "summary": "Subsidies of 40% to 50% on tractors, power tillers, rotavators, sprayers, harvesters, and up to 80% for establishing Custom Hiring Centers (CHCs).",
        "benefit": "40% - 50% subsidy on farm implements; up to 80% for custom hiring centers",
        "amount": "Subsidy from ₹50,000 to ₹10,00,000 depending on equipment",
        "eligibility": "Small, marginal, SC/ST, and women farmers receive highest subsidy preference. All registered farmers possessing land are eligible.",
        "documents": ["Aadhaar Card", "Land records", "Caste certificate (if applicable)", "Bank passbook copy", "Passport-size photograph"],
        "how_to_apply": "Apply through the Direct Benefit Transfer in Agriculture Mechanization portal (agrimachinery.nic.in) or district agriculture engineering wing.",
        "state": "All states",
        "status": "Active · Online Portal Open",
        "url": "https://agrimachinery.nic.in/",
        "icon": "tractor",
        "tags": ["tractor", "mechanization", "power tiller", "sprayer", "custom hiring", "equipment"],
        "crops": ["All Crops"]
    },
    {
        "id": "pkvy",
        "name": "PKVY (Paramparagat Krishi Vikas Yojana)",
        "short_name": "PKVY",
        "category": "Organic Farming",
        "ministry": "Ministry of Agriculture & Farmers Welfare",
        "summary": "Support of ₹50,000 per hectare over 3 years for organic farming clusters, bio-fertilizers, vermicompost, PGS-India certification, and packaging.",
        "benefit": "₹50,000/ha financial assistance (₹31,000/ha directly for organic inputs and bio-fertilizers)",
        "amount": "₹50,000 / hectare",
        "eligibility": "Farmers forming clusters of at least 20 hectares (or 50 farmers). Individual farmers can join existing local clusters.",
        "documents": ["Aadhaar Card", "Cluster membership certificate", "Land records", "Bank Account details"],
        "how_to_apply": "Contact Regional Council, District Agriculture Officer, or register cluster on the Jaivik Kheti portal (jaivikkheti.in).",
        "state": "All states",
        "status": "Active · Cluster-Based",
        "url": "https://pgsindia-ncof.gov.in/",
        "icon": "leaf",
        "tags": ["organic", "biofertilizer", "natural farming", "vermicompost", "chemical free"],
        "crops": ["Vegetables", "Spices", "Millets", "Pulses", "Fruits", "Paddy", "Wheat"]
    },
    {
        "id": "soil-health",
        "name": "Soil Health Card Scheme",
        "short_name": "Soil Health Card",
        "category": "Soil & Nutrients",
        "ministry": "Ministry of Agriculture & Farmers Welfare",
        "summary": "Free soil testing and issue of customized Soil Health Cards every 2 years containing status of 12 nutrients and dosage guidance for fertilizers.",
        "benefit": "Free soil nutrient analysis (N, P, K, S, Zn, Fe, Cu, Mn, Bo, pH, EC, OC) & recommended fertilizer dosages",
        "amount": "100% Free Service",
        "eligibility": "Every farmer possessing agricultural land in India.",
        "documents": ["Aadhaar Card", "Khasra/Survey Number of farm plot"],
        "how_to_apply": "Soil samples collected by local agriculture extension workers or submit soil sample at the nearest Soil Testing Laboratory.",
        "state": "All states",
        "status": "Active · Ongoing",
        "url": "https://soilhealth.dac.gov.in/",
        "icon": "test-tube",
        "tags": ["soil test", "fertilizer", "soil health", "npk", "nutrients", "urea"],
        "crops": ["All Crops"]
    },
    {
        "id": "aif",
        "name": "Agriculture Infrastructure Fund (AIF)",
        "short_name": "AIF",
        "category": "Infrastructure & Storage",
        "ministry": "Ministry of Agriculture & Farmers Welfare",
        "summary": "Medium-to-long term debt financing for post-harvest management projects (warehouses, cold storage, sorting units, primary processing) with 3% interest subvention.",
        "benefit": "3% per annum interest subvention up to ₹2 Crore for up to 7 years, plus credit guarantee coverage under CGTMSE",
        "amount": "Financing up to ₹2 Crore",
        "eligibility": "Primary Agricultural Credit Societies (PACS), Marketing Cooperatives, FPOs, SHGs, Joint Liability Groups, Agri-entrepreneurs, and Startups.",
        "documents": ["Detailed Project Report (DPR)", "Land documents/lease agreement", "KYC documents", "Bank loan application"],
        "how_to_apply": "Register and submit online DPR through the National AIF Portal (agriinfra.dac.gov.in).",
        "state": "All states",
        "status": "Active · Year-Round",
        "url": "https://agriinfra.dac.gov.in/",
        "icon": "building",
        "tags": ["cold storage", "warehouse", "post harvest", "processing", "interest subvention", "fpo"],
        "crops": ["All Crops", "Fruits", "Vegetables", "Grains"]
    },
    {
        "id": "nbhm",
        "name": "NBHM (National Beekeeping & Honey Mission)",
        "short_name": "NBHM",
        "category": "Allied & Beekeeping",
        "ministry": "Ministry of Agriculture & Farmers Welfare",
        "summary": "Subsidies up to 80% on scientific bee boxes, honey extraction units, custom bee breeding, pollination support, and honey quality testing labs.",
        "benefit": "Financial assistance up to ₹40,000 to ₹1,00,000 for bee colonies, boxes, and extraction equipment",
        "amount": "Up to 80% subsidy for small beekeepers",
        "eligibility": "Individual farmers, beekeepers, cooperatives, and SHGs engaged or interested in apiculture.",
        "documents": ["Aadhaar Card", "National Honey Board registration", "Bank details", "Training certificate (if any)"],
        "how_to_apply": "Register on the Madhukranti portal (madhukranti.in) or apply through State Horticulture Department.",
        "state": "All states",
        "status": "Active · Applications Open",
        "url": "https://nbhm.gov.in/",
        "icon": "bee",
        "tags": ["beekeeping", "honey", "apiculture", "pollination", "sweet revolution", "boxes"],
        "crops": ["Mustard", "Sunflower", "Fruits", "Horticulture", "Litchi", "Apple"]
    },
    {
        "id": "enam",
        "name": "e-NAM (National Agriculture Market)",
        "short_name": "e-NAM",
        "category": "Market & Trading",
        "ministry": "Ministry of Agriculture & Farmers Welfare",
        "summary": "Pan-India electronic trading portal integrating 1,361+ mandis across 23 states to provide transparent price discovery and direct farmer-to-buyer sales.",
        "benefit": "Direct online bidding, zero middlemen fee, electronic payment to bank account, and quality assaying",
        "amount": "Free access to 1,300+ national mandis",
        "eligibility": "Any farmer wishing to sell their produce at regulated APMC mandis online.",
        "documents": ["Aadhaar Card", "Bank Account Details", "Mobile Number linked to bank"],
        "how_to_apply": "Register online on the e-NAM portal (enam.gov.in) or visit the e-NAM help desk at your local APMC mandi.",
        "state": "All states",
        "status": "Active · Real-Time Trading",
        "url": "https://enam.gov.in/",
        "icon": "shopping-cart",
        "tags": ["mandi", "market", "enam", "prices", "selling", "bidding", "apmc"],
        "crops": ["All agricultural commodities"]
    },
    {
        "id": "midh",
        "name": "MIDH (Mission for Integrated Development of Horticulture)",
        "short_name": "MIDH",
        "category": "Horticulture",
        "ministry": "Ministry of Agriculture & Farmers Welfare",
        "summary": "Subsidies up to 50% for commercial orchards, polyhouses, shade nets, tissue culture units, mushroom cultivation, and cold storage chains.",
        "benefit": "40% - 50% subsidy on polyhouse construction, micro-irrigation, and planting material",
        "amount": "Up to ₹50,000/ha for plantation; up to ₹9.35 Lakh for 1000m² polyhouse",
        "eligibility": "Farmers growing fruits, vegetables, flowers, spices, aromatic plants, or setting up protected cultivation.",
        "documents": ["Land records", "Soil & water suitability test", "Project estimate", "Aadhaar Card", "Bank passbook"],
        "how_to_apply": "Apply via State Horticulture Mission (SHM) portal or District Horticulture Officer.",
        "state": "All states",
        "status": "Active · Applications Open",
        "url": "https://midh.gov.in/",
        "icon": "flower",
        "tags": ["polyhouse", "shade net", "fruits", "vegetables", "orchard", "mushrooms", "greenhouse"],
        "crops": ["Tomato", "Capsicum", "Banana", "Mango", "Flowers", "Papaya", "Citrus", "Spices"]
    }
]

# Add convenient aliases for frontend compatibility
for _s in GOVERNMENT_SCHEMES:
    if "title" not in _s:
        _s["title"] = _s["name"]
    if "shortName" not in _s:
        _s["shortName"] = _s.get("short_name", _s["name"])
    if "howToApply" not in _s:
        _s["howToApply"] = _s.get("how_to_apply", "")

def get_all_schemes():
    return GOVERNMENT_SCHEMES

def search_schemes(query: str = "", category: str = "", state: str = "", crop: str = ""):
    """Filter schemes matching the criteria."""
    query_str = query.strip().lower()
    cat_str = category.strip().lower()
    state_str = state.strip().lower()
    crop_str = crop.strip().lower()

    results = []
    for s in GOVERNMENT_SCHEMES:
        # Category filter
        if cat_str and cat_str != "all":
            if cat_str not in s["category"].lower() and cat_str not in s.get("short_name", "").lower():
                continue

        # State filter
        if state_str and state_str != "all" and state_str != "all states":
            s_state = s.get("state", "").lower()
            if s_state != "all states" and state_str not in s_state:
                continue

        # Crop filter
        if crop_str and crop_str != "all" and crop_str != "all crops":
            crops_list = [c.lower() for c in s.get("crops", [])]
            if "all crops" not in crops_list and not any(crop_str in c for c in crops_list):
                continue

        # Query search across multiple fields
        if query_str:
            searchable = " ".join([
                s["name"], s.get("short_name", ""), s["summary"], s["benefit"],
                s["eligibility"], s.get("category", ""), " ".join(s.get("tags", [])),
                " ".join(s.get("crops", []))
            ]).lower()
            if query_str not in searchable:
                continue

        results.append(s)

    return results

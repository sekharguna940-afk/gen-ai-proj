from typing import TypedDict, Dict, List
import os
import logging
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

working_dir = os.getcwd()

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

class State(TypedDict):
    query: str
    category: str
    sentiment: str
    weather: str
    response: str
    chat_history: List[object]

llm = None
app = None

# Fallback smart query responder
def smart_fallback_response(query: str) -> str:
    q = query.lower()
    if any(k in q for k in ["pm-kisan", "pmkisan", "6000", "installment", "samman nidhi"]):
        return ("**PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)** provides **₹6,000 per year** in 3 equal installments of ₹2,000 "
                "directly to the bank account of landholding farmers.\n\n"
                "• **Eligibility**: All landholding farmer families with cultivable land.\n"
                "• **How to Apply**: Visit [pmkisan.gov.in](https://pmkisan.gov.in/) or visit your nearest Common Service Center (CSC).\n"
                "• **Required Documents**: Aadhaar Card, Land Records (Khatauni/Khasra), Aadhaar-linked Bank Account.")
    elif any(k in q for k in ["insurance", "pmfby", "crop loss", "flood", "drought", "bima"]):
        return ("**PMFBY (Pradhan Mantri Fasal Bima Yojana)** protects farmers against unforeseen crop loss.\n\n"
                "• **Premium Rates**: Only 2% for Kharif crops, 1.5% for Rabi crops, and 5% for commercial/horticultural crops.\n"
                "• **Coverage**: Sowing/planting risks, mid-season adversity, standing crop losses, and post-harvest losses.\n"
                "• **Apply at**: [pmfby.gov.in](https://pmfby.gov.in/) before the seasonal cut-off date.")
    elif any(k in q for k in ["kcc", "kisan credit card", "loan", "credit", "interest"]):
        return ("**Kisan Credit Card (KCC)** provides institutional credit up to **₹3 Lakh** at an effective subsidized interest rate of **4%**.\n\n"
                "• **Collateral-Free Limit**: Up to ₹1.60 Lakh.\n"
                "• **Eligibility**: Owner cultivators, tenant farmers, sharecroppers, and allied farmers (dairy/poultry/fisheries).\n"
                "• **How to Apply**: Download the simplified one-page KCC application form from [pmkisan.gov.in](https://pmkisan.gov.in/) and submit at any bank.")
    elif any(k in q for k in ["irrigation", "pmksy", "drip", "sprinkler", "water"]):
        return ("**PMKSY (Pradhan Mantri Krishi Sinchayee Yojana) - Per Drop More Crop** provides **up to 55% subsidy** for micro-irrigation.\n\n"
                "• **Benefits**: 55% subsidy for Small & Marginal farmers, 45% for other farmers.\n"
                "• **Water Savings**: Saves 40-50% water and boosts crop yields by 20-30%.\n"
                "• **Apply at**: State Horticulture / Agriculture Department portal or District Agriculture Office.")
    elif any(k in q for k in ["solar", "kusum", "pump", "electricity"]):
        return ("**PM-KUSUM Scheme** provides **up to 60% subsidy** for installing standalone solar irrigation pumps (up to 7.5 HP).\n\n"
                "• Central Govt pays 30%, State Govt pays 30%, Bank loan covers 30%, and farmer pays only 10%!\n"
                "• Eliminate diesel pump expenses entirely.\n"
                "• Apply on your State Renewable Energy Agency portal.")
    elif any(k in q for k in ["tractor", "machine", "machinery", "smam", "equipment"]):
        return ("**SMAM (Sub-Mission on Agricultural Mechanization)** offers **40% to 50% subsidy** on tractors, tillers, rotavators, and sprayers.\n\n"
                "• Subsidies up to 80% for setting up Custom Hiring Centers (CHCs).\n"
                "• Apply via Direct Benefit Transfer in Agricultural Mechanization at [agrimachinery.nic.in](https://agrimachinery.nic.in/).")
    elif any(k in q for k in ["scheme", "yojana", "subsidy", "sarkari"]):
        return ("India offers multiple major agricultural welfare schemes for farmers:\n\n"
                "1. **PM-KISAN**: ₹6,000/yr direct income support ([pmkisan.gov.in](https://pmkisan.gov.in/))\n"
                "2. **PMFBY**: Low-cost crop loss insurance ([pmfby.gov.in](https://pmfby.gov.in/))\n"
                "3. **PMKSY**: Up to 55% subsidy on drip/sprinkler systems ([pmksy.gov.in](https://pmksy.gov.in/))\n"
                "4. **KCC**: 4% interest rate crop loans up to ₹3 Lakh\n"
                "5. **PM-KUSUM**: 60% subsidy on solar water pumps ([pmkusum.mnre.gov.in](https://pmkusum.mnre.gov.in/))\n"
                "6. **SMAM**: 40-50% subsidy on farm implements ([agrimachinery.nic.in](https://agrimachinery.nic.in/))\n"
                "7. **Soil Health Card**: 100% free soil fertility testing\n\n"
                "Check out the **Government Schemes** section on this portal for verified details and application procedures.")
    elif any(k in q for k in ["weather", "rain", "temperature", "forecast", "monsoon"]):
        return ("You can monitor real-time weather forecasts and hourly temperature, humidity, and rainfall on the **Weather Advisory** section of this portal.")
    elif any(k in q for k in ["disease", "pest", "leaf", "rot", "blight", "yellow", "spot"]):
        return ("For instant plant disease diagnosis, upload a clear photo of the affected crop leaf in the **Crop Care** section. Our AI will identify the pathogen and prescribe prevention and treatments.")
    else:
        return ("I am your **Kisaan Saathi AI Assistant**. I can help you with:\n\n"
                "• **Government Schemes & Subsidies** (PM-KISAN, PMFBY, KCC, Solar Pumps, Farm Equipment)\n"
                "• **Crop Health & Disease Diagnostics** (identification, treatment, fungicides)\n"
                "• **Water Footprint & Irrigation Planning** (drip irrigation, water volume required)\n"
                "• **Mandi Market Prices & Trends**\n\n"
                f"How can I assist you with your question about: *'{query}'*?")


class FallbackApp:
    def invoke(self, state: dict) -> dict:
        query = state.get("query", "")
        chat_history = state.get("chat_history", [])
        answer = smart_fallback_response(query)
        return {
            "query": query,
            "category": "Farming Assistance",
            "sentiment": "Positive",
            "response": answer,
            "chat_history": chat_history + [query, answer]
        }

# Attempt LangGraph setup if LangChain and Groq are available with valid key
try:
    if GROQ_API_KEY and not GROQ_API_KEY.startswith("replace_"):
        from langgraph.graph import StateGraph, END
        from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
        from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
        from langchain_groq import ChatGroq

        llm = ChatGroq(
            groq_api_key=GROQ_API_KEY,
            temperature=0.2,
            model_name="llama-3.3-70b-versatile"
        )

        def categorize(state: State) -> State:
            prompt = ChatPromptTemplate.from_template(
                "Categorize the following Farmer query into one of these: "
                "Financial, Personal, Farming Assistance, Education, Government Schemes, Plant Disease. Query: {query}"
            )
            category = (prompt | llm).invoke({"query": state["query"]}).content
            return {**state, "category": category}

        def analyze_sentiment(state: State) -> State:
            prompt = ChatPromptTemplate.from_template(
                "Analyze the sentiment: Positive, Neutral, or Negative. Query: {query}"
            )
            sentiment = (prompt | llm).invoke({"query": state["query"]}).content
            return {**state, "sentiment": sentiment}

        def handle_response(state: State) -> State:
            prompt = ChatPromptTemplate.from_messages([
                ("system", "You are an empathetic agricultural expert and assistant helping Indian farmers. "
                           "Provide accurate, actionable advice on government schemes, crop care, subsidies, and farm management."),
                MessagesPlaceholder(variable_name="chat_history"),
                ("human", "{query}")
            ])
            res = (prompt | llm).invoke({
                "query": state["query"],
                "chat_history": state.get("chat_history", [])
            }).content
            return {**state, "response": res}

        workflow = StateGraph(State)
        workflow.add_node("categorize", categorize)
        workflow.add_node("analyze_sentiment", analyze_sentiment)
        workflow.add_node("handle_response", handle_response)
        workflow.add_edge("categorize", "analyze_sentiment")
        workflow.add_edge("analyze_sentiment", "handle_response")
        workflow.add_edge("handle_response", END)
        workflow.set_entry_point("categorize")
        app = workflow.compile()
        logger.info("LangGraph farmer assistant compiled successfully with Groq.")
    else:
        app = FallbackApp()
        logger.info("Using smart fallback farmer assistant.")
except Exception as e:
    logger.warning(f"Could not initialize LangGraph assistant: {e}. Using fallback.")
    app = FallbackApp()


def main():
    logger.info("Farmer Assistant module initialized.")

if __name__ == "__main__":
    print("Running Farmer Assistant in interactive CLI mode...")
    while True:
        try:
            q = input("\nFarmer: ").strip()
            if q.lower() in ("exit", "quit"):
                break
            if not q:
                continue
            res = app.invoke({"query": q, "chat_history": []})
            print(f"Assistant: {res.get('response', '')}")
        except (KeyboardInterrupt, EOFError):
            break

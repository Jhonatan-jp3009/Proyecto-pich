# 🏟️ Análisis de Arquitectura: Sistema de IA para Análisis Deportivo de Alto Rendimiento

> **Documento de Análisis Técnico — IA-Course-UdB**  
> Conecta el sistema propuesto con las tecnologías y patrones vistos en las 5 unidades del curso.

---

## 📐 Visión General de la Arquitectura

La imagen muestra un sistema de **4 capas progresivas** para análisis deportivo inteligente en tiempo real:

```
Capa 1 ──► Capa 2 ──► Capa 3 ──► Capa 4
 [Datos]  [Percepción] [Cerebro] [Salidas]
```

Cada capa tiene una responsabilidad clara y se alimenta de la anterior. A continuación se analiza cada una contra el contenido del curso y se propone la implementación óptima.

---

## 🟩 CAPA 1 — Captura de Datos

### Descripción
| Fuente              | Detalle                          |
|---------------------|----------------------------------|
| Visión (cámaras)    | 4K, multiángulo, 60fps           |
| Wearables / GPS     | FC, acelerómetro, IMU            |
| Datos históricos    | Partidos, lesiones, métricas     |
| Datos fisiológicos  | HRV, lactato, sueño              |

### Mapeo con el Curso

Esta capa no tiene código en el curso directamente, pero el **pipeline de Ingesta (Fase 1)** visto en el **Reto 7** (`Reto7_Ingesta_y_Preprocesamiento.ipynb`) aplica directamente: la misma lógica de consolidar múltiples fuentes dispersas en un DataFrame estructurado es la base de esta capa.

### Implementación Propuesta

```python
# ingesta_multimodal.py

import pandas as pd
import cv2       # Unidad 4: cámara
import requests  # Para APIs de wearables (Garmin, Polar, etc.)

# 1. Stream de cámara
def capturar_frame(cap: cv2.VideoCapture) -> np.ndarray:
    ret, frame = cap.read()
    return frame if ret else None

# 2. Datos de wearables vía API REST
def obtener_datos_wearable(jugador_id: str) -> dict:
    resp = requests.get(f"https://api.wearable-provider.com/athlete/{jugador_id}")
    return resp.json()  # FC, GPS, acelerómetro

# 3. Datos históricos (el patrón del Reto 7)
def cargar_historico(path: str) -> pd.DataFrame:
    return pd.read_csv(path)
```

### ⚡ Optimización Propuesta
- Usar **Apache Kafka** o **Python asyncio** (visto en `Unidad 1/fundamentos/4_async_python.ipynb`) para captura concurrente de múltiples fuentes sin bloqueo.
- Usar **Pydantic** (visto en `Unidad 1/fundamentos/5_pydantic.ipynb`) para validar y serializar los datos de cada fuente con esquemas estrictos:

```python
from pydantic import BaseModel  # Unidad 1

class DatoWearable(BaseModel):
    jugador_id: str
    fc: float           # Frecuencia cardíaca (bpm)
    latitud: float
    longitud: float
    aceleracion_x: float
    timestamp: str
```

---

## 🟣 CAPA 2 — Modelos de Percepción (Visión por Computadora)

### Descripción
| Módulo              | Función                           |
|---------------------|-----------------------------------|
| YOLOv11 + ByteTrack | Detección y tracking de jugadores |
| ViTPose / MediaPipe | Estimación de postura 3D          |
| Análisis movimiento | Velocidad, aceleración, heatmaps  |
| LSTM / XGBoost      | Predicción de lesiones            |

### Mapeo con el Curso ✅ COBERTURA ALTA

Esta capa es la **mejor cubierta** por el curso:

| Componente          | Notebook del Curso                              |
|---------------------|-------------------------------------------------|
| Conceptos de imagen (matrices, píxeles, BGR→RGB) | `Unidad 4/computer-vision.ipynb` |
| Convolución 2D y filtros (base de YOLO)    | `Unidad 4/computer-vision.ipynb` |
| Arquitectura CNN (`Conv2D`, `MaxPooling2D`) | `Unidad 4/IA_Moderna.ipynb` (MNIST CNN) |
| LSTM para series temporales                | `Unidad 4/IA_Moderna.ipynb` (predicción senoidal) |
| XGBoost                                    | `Unidad 3/1_ML_implementation.ipynb` + PyCaret |

### Implementación Propuesta (basada en el curso)

```python
# percepcion.py

import cv2
import numpy as np
from tensorflow.keras.models import load_model      # Unidad 4
from tensorflow.keras.layers import LSTM, Dense     # Unidad 4

# ─── A. Detección de jugadores con YOLOv11 ───────────────────
# YOLOv11 aplica internamente Conv2D + MaxPooling (como el MNIST CNN del curso)
# pero preentrenado sobre millones de imágenes deportivas.

from ultralytics import YOLO  # pip install ultralytics

detector = YOLO("yolo11n.pt")

def detectar_jugadores(frame: np.ndarray) -> list:
    """
    Aplica detección de objetos. Internamente usa la misma lógica
    de Conv2D + MaxPooling2D que vimos en IA_Moderna.ipynb (MNIST).
    """
    resultados = detector(frame)
    return resultados[0].boxes.data.tolist()  # [x1, y1, x2, y2, conf, clase]


# ─── B. Análisis de postura con MediaPipe ────────────────────
import mediapipe as mp

pose = mp.solutions.pose.Pose()

def estimar_postura(frame_rgb: np.ndarray) -> dict:
    """
    MediaPipe aplica la misma idea de convoluciones que vimos
    con cv2.filter2D() en computer-vision.ipynb.
    Devuelve 33 landmarks 3D del cuerpo.
    """
    resultado = pose.process(frame_rgb)
    if resultado.pose_landmarks:
        return {i: (lm.x, lm.y, lm.z) 
                for i, lm in enumerate(resultado.pose_landmarks.landmark)}
    return {}


# ─── C. Predicción de lesiones con LSTM ──────────────────────
# Exactamente el mismo patrón de "ventanas deslizantes" de IA_Moderna.ipynb

def crear_ventanas_temporales(serie: np.ndarray, pasos: int = 20):
    """Mismo patrón que IA_Moderna.ipynb para RNN/LSTM"""
    X = []
    for i in range(len(serie) - pasos):
        X.append(serie[i:i+pasos])
    return np.array(X).reshape(-1, pasos, serie.shape[1])

modelo_lesiones = load_model("modelos/lstm_lesiones.keras")

def predecir_riesgo_lesion(historico_metricas: np.ndarray) -> float:
    ventanas = crear_ventanas_temporales(historico_metricas)
    prob = modelo_lesiones.predict(ventanas)
    return float(prob[-1])  # Probabilidad de lesión en próxima sesión
```

### ⚡ Optimización Propuesta
- **Transfer Learning** sobre YOLOv11: No entrenar desde cero. Usar los pesos preentrenados y hacer fine-tuning solo con imágenes de fútbol/baloncesto. Es más rápido y preciso.
- **LSTM apiladas (2 capas)**: El curso muestra LSTM de 1 capa. Para predicción de lesiones, usar 2 capas LSTM (como el Reto 4 del PDF del curso — Beijing PM2.5):

```python
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.models import Sequential

modelo_lesion = Sequential([
    LSTM(128, return_sequences=True, input_shape=(pasos, n_features)),
    Dropout(0.2),
    LSTM(64),
    Dropout(0.2),
    Dense(1, activation='sigmoid')  # Probabilidad de lesión 0-1
])
```

---

## 🟤 CAPA 3 — Cerebro del Agente (LLM + RAG + Lógica)

### Descripción
| Componente           | Función                                          |
|----------------------|--------------------------------------------------|
| LLM orquestador      | GPT-4o / Claude / Llama 3 — Razonamiento + planes |
| RAG + base conocimiento | Literatura deportiva + historial del jugador  |
| Agentes especializados | Táctico / Físico / Psicológico / Nutricional   |

### Mapeo con el Curso ✅ COBERTURA DIRECTA

Esta capa es exactamente lo que se implementó en la **Unidad 5** (`agent-ai.ipynb`):

| Componente               | Notebook del Curso                          |
|--------------------------|---------------------------------------------|
| LLM orquestador (Gemini) | `Unidad 5/agent-ai.ipynb` — `ChatGoogleGenerativeAI` |
| Patrón ReAct             | `Unidad 5/agent-ai.ipynb` — `create_react_agent`    |
| Herramientas (`@tool`)   | `Unidad 5/agent-ai.ipynb` — `@tool` decorator       |
| Transformers preentrenados | `Unidad 4/IA_Moderna.ipynb` — GPT-2 HuggingFace |

### Implementación Propuesta (extendiendo el curso)

```python
# agentes_deportivos.py
# Extensión directa de agent-ai.ipynb (Unidad 5)

import os
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_classic.agents import create_react_agent, AgentExecutor
from langchain.tools import tool
from langchain.vectorstores import FAISS          # RAG
from langchain.embeddings import HuggingFaceEmbeddings  # Transformer
from langchain_classic.prompts import PromptTemplate

load_dotenv()
llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash-preview-09-2025",
    google_api_key=os.getenv("GOOGLE_API_KEY"),
    temperature=0.2
)

# ─── RAG: Base de conocimiento ──────────────────────────────
# Usa Sentence-Transformers (como el Reto 7) para vectorizar documentos deportivos
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
vector_store = FAISS.load_local("vectorstore_deportivo/", embeddings)
retriever = vector_store.as_retriever(search_kwargs={"k": 3})


# ─── Herramientas de Agentes Especializados ──────────────────

@tool
def analizar_carga_fisica(jugador_id: str) -> str:
    """
    Analiza la carga física del jugador con base en métricas de wearable
    y devuelve recomendaciones de carga de entrenamiento.
    """
    # Consulta a la base de datos de métricas
    return f"Jugador {jugador_id}: Carga acumulada alta. Recomendar sesión de recuperación activa."

@tool
def evaluar_riesgo_lesion(jugador_id: str) -> str:
    """
    Consulta el modelo LSTM de predicción de lesiones y devuelve
    el nivel de riesgo (Bajo/Medio/Alto) con el área corporal en riesgo.
    """
    riesgo = predecir_riesgo_lesion(obtener_series_jugador(jugador_id))
    nivel = "Alto" if riesgo > 0.7 else "Medio" if riesgo > 0.4 else "Bajo"
    return f"Riesgo de lesión para {jugador_id}: {nivel} ({riesgo:.0%})"

@tool
def buscar_literatura_deportiva(consulta: str) -> str:
    """
    RAG sobre literatura deportiva: busca en el historial de partidos,
    estudios de rendimiento y planes de entrenamiento documentados.
    """
    docs = retriever.get_relevant_documents(consulta)
    return "\n".join([d.page_content for d in docs])


# ─── Agente orquestador (patrón Unidad 5) ────────────────────
tools = [analizar_carga_fisica, evaluar_riesgo_lesion, buscar_literatura_deportiva]

prompt = PromptTemplate.from_template("""
Eres el cerebro de un sistema de análisis deportivo de alto rendimiento.
Tienes acceso a herramientas para analizar carga física, riesgo de lesiones
y literatura deportiva científica.

Herramientas disponibles: {tools}

Formato ReAct:
Thought: razonamiento
Action: herramienta
Action Input: entrada
Observation: resultado
Final Answer: respuesta final

Consulta: {input}
{agent_scratchpad}
""")

agent = create_react_agent(llm, tools, prompt)
agente_deportivo = AgentExecutor(
    agent=agent, tools=tools, verbose=True, max_iterations=5
)

# Uso:
# resultado = agente_deportivo.invoke({"input": "Evalúa al jugador #10 y recomienda entrenamiento para mañana"})
```

### ⚡ Optimización Propuesta: Multi-Agente con LangGraph

El curso muestra un **agente único**. La arquitectura propuesta tiene **agentes especializados** (Táctico, Físico, Psicológico, Nutricional). Esto se implementa mejor con **LangGraph** (que el curso usa en `Unidad 5`):

```python
from langgraph.graph import StateGraph, END
from typing import TypedDict, List

class EstadoDeportivo(TypedDict):
    jugador_id: str
    metricas: dict
    analisis_fisico: str
    plan_tactico: str
    alerta_lesion: str
    recomendacion_final: str

# Nodo 1: Agente Físico
def agente_fisico(state: EstadoDeportivo) -> EstadoDeportivo:
    resultado = agente_deportivo.invoke({"input": f"Analiza carga física del jugador {state['jugador_id']}"})
    state["analisis_fisico"] = resultado["output"]
    return state

# Nodo 2: Agente Táctico
def agente_tactico(state: EstadoDeportivo) -> EstadoDeportivo:
    resultado = agente_deportivo.invoke({"input": f"Genera plan táctico para {state['jugador_id']}"})
    state["plan_tactico"] = resultado["output"]
    return state

# Nodo 3: Agente de Riesgo
def agente_riesgo(state: EstadoDeportivo) -> EstadoDeportivo:
    resultado = agente_deportivo.invoke({"input": f"Evalúa riesgo de lesión del jugador {state['jugador_id']}"})
    state["alerta_lesion"] = resultado["output"]
    return state

# Construcción del grafo multi-agente
grafo = StateGraph(EstadoDeportivo)
grafo.add_node("fisico", agente_fisico)
grafo.add_node("tactico", agente_tactico)
grafo.add_node("riesgo", agente_riesgo)

grafo.set_entry_point("fisico")
grafo.add_edge("fisico", "tactico")
grafo.add_edge("tactico", "riesgo")
grafo.add_edge("riesgo", END)

sistema = grafo.compile()
```

---

## 🟢 CAPA 4 — Interfaces de Salida y Retroalimentación

### Descripción
| Interfaz               | Función                    |
|------------------------|----------------------------|
| Dashboard entrenador   | Métricas + alertas         |
| App del jugador        | Retroalimentación personal |
| Planes de entrenamiento| Sesiones adaptativas       |
| Alertas de riesgo      | Lesión / sobrecarga        |

### Mapeo con el Curso

El curso menciona **Streamlit** en el PDF de retos como plataforma de despliegue, y la Unidad 3 usa **Plotly + Dash** para visualizaciones.

### Implementación Propuesta

```python
# dashboard.py — usando Dash (visto en Unidad 3)

import dash
from dash import dcc, html
import plotly.graph_objects as go

app = dash.Dash(__name__)

app.layout = html.Div([
    html.H1("Dashboard de Rendimiento Deportivo"),
    
    # Mapa de calor del campo (heatmap de movimiento)
    dcc.Graph(id="heatmap-campo"),
    
    # Métricas en tiempo real
    dcc.Graph(id="metricas-rt"),
    
    # Alertas de riesgo
    html.Div(id="alertas-lesion", style={"color": "red"}),
    
    # Actualización automática cada 2 segundos
    dcc.Interval(id="intervalo", interval=2000)
])
```

---

## 📊 Tabla de Cobertura del Curso vs. Arquitectura

| Capa / Componente        | Tecnología Requerida      | Cubierto en el Curso | Notebook                      |
|--------------------------|---------------------------|----------------------|-------------------------------|
| Ingesta multimodal       | Pandas, asyncio, Pydantic | ✅ Completo          | U1/async, U1/pydantic, Reto 7 |
| Detección objetos (YOLO) | CNN, Conv2D               | ⚠️ Base teórica     | U4/IA_Moderna, U4/computer-vision |
| Postura 3D (MediaPipe)   | Filtros, convolución      | ⚠️ Base teórica     | U4/computer-vision            |
| Series temporales (LSTM) | LSTM apiladas             | ✅ Completo          | U4/IA_Moderna                 |
| Predicción lesiones      | XGBoost, PyCaret          | ✅ Completo          | U3/1_ML_implementation        |
| Agente ReAct             | LangChain, Gemini         | ✅ Completo          | U5/agent-ai                   |
| Multi-agente (LangGraph) | LangGraph StateGraph      | ✅ Completo          | U5/agent-ai                   |
| RAG                      | FAISS, Sentence-Transformers | ⚠️ Partial        | Reto 7 (embeddings)           |
| Dashboard                | Plotly, Dash, Streamlit   | ✅ Disponible        | U3/1_ML_implementation        |

**Leyenda:** ✅ Completo en el curso | ⚠️ Hay base, faltaría extender | ❌ No cubierto

---

## 🚀 Implementación Óptima Sugerida: Hoja de Ruta

### Fase 1 (Fundamentos) — Lo que ya tienes
Construir el pipeline de datos y el modelo de predicción de lesiones reutilizando directamente los notebooks del curso (U3 + U4).

### Fase 2 (Percepción) — Extensión de U4
Integrar YOLOv11 y MediaPipe encima de los conceptos de convolución ya aprendidos.

### Fase 3 (Inteligencia) — Extensión de U5
Escalar el agente ReAct básico de `agent-ai.ipynb` a un grafo multi-agente con LangGraph con RAG sobre historial deportivo.

### Fase 4 (Despliegue) — Dash/Streamlit
Conectar las salidas del sistema al dashboard usando Dash (U3) o Streamlit.

```
U1 (Fundamentos Python/Pydantic/async)
        ↓
U3 (ML: XGBoost/PyCaret → predicción lesiones)
        ↓
U4 (CNN/LSTM/OpenCV → percepción visual)
        ↓
U5 (LangGraph multi-agente + Gemini → cerebro)
        ↓
Reto 7 (RAG con Sentence-Transformers → base de conocimiento)
```

---

*Generado como análisis de arquitectura para el proyecto IA-Course-UdB, 2026.*

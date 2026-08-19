#!/usr/bin/env python3
"""
Agente de Inventario de Equipos - Axis Group
Recolecta datos del sistema y los envía al servidor
Puede instalarse como servicio en Windows
"""

import os
import sys
import json
import time
import platform
import psutil
import requests
import subprocess
from datetime import datetime
from pathlib import Path

class ConfigManager:
    """Maneja la configuración del servidor destino"""

    def __init__(self):
        self.config_file = Path(os.path.expandvars(r'%PROGRAMFILES%\Axis\Inventario\config.json'))
        self.config_file.parent.mkdir(parents=True, exist_ok=True)

    def get_config(self):
        """Lee la configuración"""
        if self.config_file.exists():
            try:
                with open(self.config_file, 'r') as f:
                    return json.load(f)
            except:
                return self._default_config()
        return self._default_config()

    def _default_config(self):
        return {
            'servidor': 'http://localhost:3335',
            'intervalo_segundos': 3600,  # 1 hora
            'habilitado': True
        }

    def save_config(self, config):
        """Guarda la configuración"""
        self.config_file.parent.mkdir(parents=True, exist_ok=True)
        with open(self.config_file, 'w') as f:
            json.dump(config, f, indent=2)

    def configure_interactivo(self):
        """Permite configurar el servidor interactivamente"""
        print("\n" + "="*50)
        print("Configuración del Agente de Inventario")
        print("="*50)

        config = self.get_config()

        servidor = input(f"\nServidor destino [{config['servidor']}]: ").strip()
        if servidor:
            config['servidor'] = servidor

        intervalo = input(f"Intervalo en segundos [{config['intervalo_segundos']}]: ").strip()
        if intervalo:
            try:
                config['intervalo_segundos'] = int(intervalo)
            except ValueError:
                print("❌ Valor inválido")

        self.save_config(config)
        print("✅ Configuración guardada\n")
        return config

class InventarioCollector:
    """Recolecta información del sistema"""

    @staticmethod
    def get_info_windows():
        """Recolecta información detallada de Windows"""
        try:
            # Información básica
            usuario = os.getenv('USERNAME', 'desconocido')
            hostname = platform.node()
            so = platform.platform()

            # CPU
            cpu = platform.processor()
            cpu_count = psutil.cpu_count(logical=False) or 0
            cpu_count_logical = psutil.cpu_count(logical=True) or 0
            cpu_freq = psutil.cpu_freq()
            cpu_freq_str = f"{cpu_freq.current:.0f} MHz" if cpu_freq else "N/A"

            # RAM
            ram_total = psutil.virtual_memory().total / (1024**3)
            ram_usado = psutil.virtual_memory().used / (1024**3)
            ram_disponible = psutil.virtual_memory().available / (1024**3)
            ram_porcentaje = psutil.virtual_memory().percent

            # Disco C:/
            disco = psutil.disk_usage('C:/')
            disco_total = disco.total / (1024**3)
            disco_usado = disco.used / (1024**3)
            disco_disponible = disco.free / (1024**3)
            disco_porcentaje = disco.percent

            # Número de serie del disco
            numero_serie_disco = 'N/A'
            try:
                resultado = subprocess.run(
                    ['wmic', 'logicaldisk', 'get', 'volumeserialnumber,name'],
                    capture_output=True, text=True, timeout=5
                )
                lineas = resultado.stdout.strip().split('\n')
                if len(lineas) > 1:
                    numero_serie_disco = lineas[1].split()[0] if lineas[1].split() else 'N/A'
            except:
                pass

            # Información del BIOS/Sistema
            bios_info = 'N/A'
            try:
                resultado = subprocess.run(
                    ['wmic', 'baseboard', 'get', 'manufacturer,product'],
                    capture_output=True, text=True, timeout=5
                )
                lineas = resultado.stdout.strip().split('\n')
                if len(lineas) > 1 and lineas[1].strip():
                    parts = lineas[1].strip().split()
                    if len(parts) >= 2:
                        bios_info = f"{parts[0]} {' '.join(parts[1:])}"
            except:
                pass

            # Información de GPU
            gpu_info = 'N/A'
            try:
                resultado = subprocess.run(
                    ['wmic', 'path', 'win32_videocontroller', 'get', 'name'],
                    capture_output=True, text=True, timeout=5
                )
                lineas = [l.strip() for l in resultado.stdout.strip().split('\n') if l.strip() and l.strip() != 'Name']
                if lineas:
                    gpu_info = lineas[0]
            except:
                pass

            # Uptime del sistema
            boot_time = psutil.boot_time()
            uptime_segundos = time.time() - boot_time
            uptime_dias = int(uptime_segundos / 86400)
            uptime_horas = int((uptime_segundos % 86400) / 3600)
            uptime_str = f"{uptime_dias}d {uptime_horas}h"

            # Información de Red
            interfaces = psutil.net_if_addrs()
            ips = []
            macs = []
            for iface, addrs in interfaces.items():
                for addr in addrs:
                    if addr.family.name == 'AF_INET':
                        ips.append(addr.address)
                    elif addr.family.name == 'AF_LINK':
                        macs.append(addr.address)

            # Información de Pantalla
            try:
                resultado = subprocess.run(
                    ['wmic', 'desktopmonitor', 'get', 'name'],
                    capture_output=True, text=True, timeout=5
                )
                monitors = [l.strip() for l in resultado.stdout.strip().split('\n') if l.strip() and l.strip() != 'Name']
                monitor_info = ', '.join(monitors) if monitors else 'N/A'
            except:
                monitor_info = 'N/A'

            return {
                'tipo_dispositivo': 'PC',
                'hostname': hostname,
                'numero_serie_disco': numero_serie_disco,
                'so': so,
                'usuario_windows': usuario,
                'cpu': cpu,
                'cpu_nucleos': cpu_count,
                'cpu_threads': cpu_count_logical,
                'cpu_frecuencia': cpu_freq_str,
                'ram_total_gb': round(ram_total, 2),
                'ram_usado_gb': round(ram_usado, 2),
                'ram_disponible_gb': round(ram_disponible, 2),
                'ram_porcentaje': round(ram_porcentaje, 1),
                'disco_total_gb': round(disco_total, 2),
                'disco_usado_gb': round(disco_usado, 2),
                'disco_disponible_gb': round(disco_disponible, 2),
                'disco_porcentaje': round(disco_porcentaje, 1),
                'placa_madre': bios_info,
                'gpu': gpu_info,
                'uptime': uptime_str,
                'ips': ips,
                'macs': macs,
                'monitor': monitor_info,
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            print(f"❌ Error recolectando info: {e}")
            return None

class InventarioAgent:
    """Agente principal de inventario"""

    def __init__(self):
        self.config_manager = ConfigManager()
        self.config = self.config_manager.get_config()

    def enviar_inventario(self):
        """Envía el inventario al servidor"""
        try:
            info = InventarioCollector.get_info_windows()
            if not info:
                return False

            headers = {'Content-Type': 'application/json'}
            respuesta = requests.post(
                f"{self.config['servidor']}/api/inventario",
                json=info,
                headers=headers,
                timeout=10
            )

            if respuesta.status_code == 200:
                data = respuesta.json()
                actualizado = data.get('actualizado', False)

                if actualizado:
                    print(f"✅ Inventario ACTUALIZADO en {self.config['servidor']}")
                    print(f"   Registro actualizado (mismo disco detectado)")
                else:
                    print(f"✅ Inventario REGISTRADO en {self.config['servidor']}")
                    print(f"   Nuevo registro creado para este equipo")

                print(f"   Hostname: {info.get('hostname')}")
                print(f"   CPU: {info.get('cpu')} ({info.get('cpu_nucleos')} núcleos)")
                print(f"   RAM: {info.get('ram_total_gb')}GB ({info.get('ram_porcentaje')}% utilizado)")
                print(f"   GPU: {info.get('gpu')}")
                print(f"   ⏳ Esperando enlace manual en la interfaz web...")
                return True
            else:
                print(f"⚠️ Error en servidor: {respuesta.status_code}")
                return False

        except requests.exceptions.ConnectionError:
            print(f"❌ No se puede conectar a {self.config['servidor']}")
            return False
        except Exception as e:
            print(f"❌ Error: {e}")
            return False

    def ejecutar_ciclo(self):
        """Ejecuta el ciclo de inventario"""
        if not self.config['habilitado']:
            print("⚠️ Agente deshabilitado en configuración")
            return

        print("🔄 Iniciando ciclo de inventario...")
        self.enviar_inventario()
        print(f"⏱️  Próximo envío en {self.config['intervalo_segundos']} segundos\n")

    def modo_servicio(self):
        """Ejecuta en modo servicio (contínuo)"""
        print("🚀 Agente de Inventario iniciado (Modo Servicio)")
        print(f"   Servidor: {self.config['servidor']}")
        print(f"   Intervalo: {self.config['intervalo_segundos']}s\n")

        while True:
            self.ejecutar_ciclo()
            time.sleep(self.config['intervalo_segundos'])

def main():
    """Punto de entrada"""
    if len(sys.argv) > 1:
        if sys.argv[1] == '--config':
            agent = InventarioAgent()
            agent.config_manager.configure_interactivo()
        elif sys.argv[1] == '--servicio':
            agent = InventarioAgent()
            agent.modo_servicio()
        elif sys.argv[1] == '--ahora':
            agent = InventarioAgent()
            agent.ejecutar_ciclo()
        else:
            print(f"Uso: {sys.argv[0]} [--config|--servicio|--ahora]")
    else:
        # Modo manual
        agent = InventarioAgent()
        print("\n" + "="*50)
        print("Agente de Inventario - Axis Group")
        print("="*50)
        print("\nOpciones:")
        print("  --config   : Configurar servidor")
        print("  --servicio : Ejecutar como servicio")
        print("  --ahora    : Enviar inventario ahora\n")
        agent.ejecutar_ciclo()

if __name__ == '__main__':
    main()

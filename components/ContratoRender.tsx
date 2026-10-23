import type { Contrato } from "../lib/contratos";
import ContratoHTML from "./ContratoHTML";
import ContratoGestionHTML from "./ContratoGestionHTML";

// Dispatcher: elige el template según el tipo de contrato. Lo usan el
// detalle admin, la página pública /firmar/[token] y el pipeline de PDF.

type Props = {
  contrato: Contrato;
  showPlaceholders?: boolean;
};

export default function ContratoRender({ contrato, showPlaceholders = true }: Props) {
  if (contrato.tipo === "gestion_alquiler") {
    return (
      <ContratoGestionHTML
        datos={contrato.datos as import("../lib/contratos").DatosContratoGestion}
        firmaPropietario={contrato.firma_propietario}
        firmaAgencia={contrato.firma_agencia}
        showPlaceholders={showPlaceholders}
      />
    );
  }
  return (
    <ContratoHTML
      datos={contrato.datos as import("../lib/contratos").DatosContratoExclusiva}
      firmaPropietario={contrato.firma_propietario}
      firmaAgencia={contrato.firma_agencia}
      showPlaceholders={showPlaceholders}
    />
  );
}

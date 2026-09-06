"use client";

import { useRouter } from "next/navigation";

function diaAnterior(dataISO: string): string {
  const [ano, mes, dia] = dataISO.split("-").map(Number);
  const anterior = new Date(ano, mes - 1, dia - 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${anterior.getFullYear()}-${pad(anterior.getMonth() + 1)}-${pad(anterior.getDate())}`;
}

function diaSeguinte(dataISO: string): string {
  const [ano, mes, dia] = dataISO.split("-").map(Number);
  const proximo = new Date(ano, mes - 1, dia + 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${proximo.getFullYear()}-${pad(proximo.getMonth() + 1)}-${pad(proximo.getDate())}`;
}

/** Navegação de data client-side — precisava ser um componente à parte
 * (em vez de Link/input direto na página, que é Server Component) porque
 * um <input type="date" defaultValue={...}> não atualiza sozinho quando
 * o Link troca só o searchParam: React reaproveita o mesmo nó do DOM e
 * "defaultValue" só vale no primeiro mount, então o campo ficava com a
 * data antiga mesmo a lista de turnos já tendo mudado (bug reportado
 * pelo Thiago). Aqui o valor é controlado direto pela prop `data` (sem
 * estado local — o parâmetro da URL já é a fonte da verdade), e a
 * navegação usa router.replace (não push) pra não empilhar uma entrada
 * de histórico por dia visitado — senão o botão "Voltar" do navegador
 * ficaria preso ciclando entre datas em vez de voltar pro início do
 * portal. */
export default function SeletorData({
  token,
  data,
  hojeISO,
}: {
  token: string;
  data: string;
  hojeISO: string;
}) {
  const router = useRouter();

  function irPara(novaData: string) {
    router.replace(`/portal/${token}/historico?data=${novaData}`);
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2">
      <button
        type="button"
        onClick={() => irPara(diaAnterior(data))}
        className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-50"
      >
        ← Anterior
      </button>
      <input
        type="date"
        value={data}
        max={hojeISO}
        onChange={(e) => {
          if (!e.target.value) return;
          irPara(e.target.value);
        }}
        className="border border-stone-300 rounded-lg px-2 py-1.5 text-sm text-center"
      />
      <button
        type="button"
        onClick={() => irPara(diaSeguinte(data))}
        disabled={data >= hojeISO}
        className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-30 disabled:hover:bg-transparent"
      >
        Seguinte →
      </button>
    </div>
  );
}

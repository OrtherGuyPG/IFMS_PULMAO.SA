
const usuarioSessao = localStorage.getItem("usuario_logado");
if (!usuarioSessao) {
    window.location.replace("index.html");
}


const SUPABASE_URL = "https://kjhqhrnkxcgjnebalykq.supabase.co";
const SUPABASE_KEY = "sb_publishable_XerA1LkwdFnhdOFV5TB5iw_y8slJZhC";

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let registrosUsuario = [];


document.addEventListener("DOMContentLoaded", () => {
    const usuario = localStorage.getItem("usuario_logado");
    const badgeUsuario = document.getElementById("usuario-ativo");
    if (usuario && badgeUsuario) {
        badgeUsuario.textContent = `● ${usuario} (Sair)`;
        badgeUsuario.style.cursor = "pointer";
        badgeUsuario.title = "Clique para sair e trocar de login";
        badgeUsuario.onclick = () => {
            localStorage.removeItem("usuario_logado");
            window.location.href = "index.html";
        };
    }
});



function temperatura(temp) {
    if (temp >= 15 && temp <= 25) return 'boa';
    else if (temp >= 26 && temp <= 31) return 'media';
    else if (temp > 31 && temp <= 36) return 'ruim';
    else if (temp < 15) return 'boa';
    else return 'ruim';
}

function Umidade(umi) {
    if (umi < 30) return 'ruim';
    else if (umi >= 30 && umi <= 39) return 'ruim';
    else if (umi >= 40 && umi <= 60) return 'media';
    else return 'boa';
}

function particula(part) {
    if (part >= 0 && part <= 9) return 'boa';
    else if (part > 9 && part <= 25) return 'media';
    else return 'ruim';
}

function calcularPontos(status) {
    if (status === 'boa') return 3;
    if (status === 'media') return 2;
    return -1;
}



async function medicao() {
    const usuario = localStorage.getItem("usuario_logado");
    if (!usuario) {
        window.location.replace("index.html");
        return;
    }

    const tempInput = document.getElementById("Temperatura").value;
    const umiInput = document.getElementById("Umidade").value;
    const partInput = document.getElementById("Particula").value;

    if (tempInput === "" || umiInput === "" || partInput === "") {
        alert("Preencha todos os campos antes de medir!");
        return;
    }

    const temp = Number(tempInput);
    const umi = Number(umiInput);
    const part = Number(partInput);

    const temperaturaresult = temperatura(temp);
    const umidaderesult = Umidade(umi);
    const particulasresult = particula(part);

    const pontos = calcularPontos(temperaturaresult) + calcularPontos(umidaderesult) + calcularPontos(particulasresult);

    let qualidade_final = "";
    if (pontos >= 5) {
        qualidade_final = "Boa qualidade do ar";
    } else if (pontos >= 3 && pontos <= 4) {
        qualidade_final = "Qualidade do ar média";
    } else {
        qualidade_final = "Qualidade do ar ruim";
    }

    const { error } = await db
        .from('medicoes')
        .insert([{
            usuario_email: usuario,
            temperatura: temp,
            umidade: umi,
            particulas: part,
            pontuacao: pontos,
            qualidade: qualidade_final
        }]);

    if (error) {
        console.error("Erro ao salvar no Supabase:", error);
        alert(`Erro ao salvar no banco: ${error.message}`);
        return;
    }

    window.location.href = "resultado.html";
}



async function mostrar() {
    const usuario = localStorage.getItem("usuario_logado");
    if (!usuario) {
        window.location.replace("index.html");
        return;
    }

    const { data, error } = await db
        .from('medicoes')
        .select('*')
        .eq('usuario_email', usuario)
        .order('id', { ascending: false })
        .limit(1);

    if (error) {
        document.getElementById("resultado").textContent = "Erro ao carregar resultado";
        document.getElementById("mensagem").textContent = `Detalhe do banco: ${error.message}`;
        return;
    }

    if (!data || data.length === 0) {
        document.getElementById("resultado").textContent = "Nenhuma medição encontrada";
        document.getElementById("pontuacao").textContent = `Conta: ${usuario}`;
        document.getElementById("mensagem").textContent = "Faça sua primeira medição para visualizar os dados aqui.";
        return;
    }

    const ultima = data[0];
    const statusTemp = temperatura(ultima.temperatura);
    const statusUmi = Umidade(ultima.umidade);
    const statusPart = particula(ultima.particulas);

    document.getElementById("resultado").textContent = ultima.qualidade;
    document.getElementById("pontuacao").textContent = `Pontuação: ${ultima.pontuacao} pts · Conta: ${usuario}`;
    
    const msgEl = document.getElementById("mensagem");
    if (ultima.pontuacao >= 5) {
        msgEl.textContent = "Condições ambientais favoráveis e seguras para atividades ao ar livre.";
    } else if (ultima.pontuacao >= 3) {
        msgEl.textContent = "Qualidade moderada. Pessoas sensíveis devem evitar esforços prolongados.";
    } else {
        msgEl.textContent = "Alerta ambiental: índices fora do ideal. Recomenda-se ventilação e cuidado.";
    }

    document.getElementById("tempValor").textContent = `${ultima.temperatura} °C`;
    const elTempStatus = document.getElementById("tempStatus");
    elTempStatus.textContent = statusTemp.toUpperCase();
    elTempStatus.className = `status ${statusTemp}`;

    document.getElementById("umiValor").textContent = `${ultima.umidade} %`;
    const elUmiStatus = document.getElementById("umiStatus");
    elUmiStatus.textContent = statusUmi.toUpperCase();
    elUmiStatus.className = `status ${statusUmi}`;

    document.getElementById("partValor").textContent = `${ultima.particulas} µg/m³`;
    const elPartStatus = document.getElementById("partStatus");
    elPartStatus.textContent = statusPart.toUpperCase();
    elPartStatus.className = `status ${statusPart}`;
}



async function carregarHistorico() {
    const usuario = localStorage.getItem("usuario_logado");
    if (!usuario) {
        window.location.replace("index.html");
        return;
    }

    const subtitulo = document.getElementById("subtitulo-usuario");
    if (subtitulo) {
        subtitulo.textContent = `Registros salvos exclusivamente para ${usuario}`;
    }

    const { data, error } = await db
        .from('medicoes')
        .select('*')
        .eq('usuario_email', usuario)
        .order('id', { ascending: false });

    const tbody = document.getElementById("corpo-tabela");

    if (error) {
        tbody.innerHTML = `<tr><td colspan="8" class="tabela-aviso">Erro ao carregar dados: ${error.message}</td></tr>`;
        return;
    }

    registrosUsuario = data || [];
    atualizarResumo(registrosUsuario);
    renderizarTabela(registrosUsuario);
}

function atualizarResumo(lista) {
    const totalEl = document.getElementById("total-registros");
    const mediaEl = document.getElementById("media-pontuacao");
    const condicaoEl = document.getElementById("condicao-predominante");

    if (!totalEl) return;

    totalEl.textContent = lista.length;

    if (lista.length === 0) {
        mediaEl.textContent = "--";
        condicaoEl.textContent = "--";
        return;
    }

    const somaPontos = lista.reduce((acc, item) => acc + Number(item.pontuacao), 0);
    const media = (somaPontos / lista.length).toFixed(1);
    mediaEl.textContent = `${media} pts`;

    if (media >= 5) {
        condicaoEl.textContent = "Boa";
    } else if (media >= 3) {
        condicaoEl.textContent = "Média";
    } else {
        condicaoEl.textContent = "Ruim";
    }
}

function renderizarTabela(lista) {
    const tbody = document.getElementById("corpo-tabela");
    const checkTodos = document.getElementById("check-todos");
    if (checkTodos) checkTodos.checked = false;

    if (lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="tabela-aviso">Nenhuma medição encontrada nesta categoria.</td></tr>`;
        atualizarSelecao();
        return;
    }

    tbody.innerHTML = lista.map((item) => {
        const dataObj = new Date(item.created_at);
        const dataDia = dataObj.toLocaleDateString("pt-BR");
        const dataHora = dataObj.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

        let classeCor = "";
        let textoBadge = "Boa";
        if (item.pontuacao >= 3 && item.pontuacao <= 4) {
            classeCor = "media";
            textoBadge = "Média";
        } else if (item.pontuacao < 3) {
            classeCor = "ruim";
            textoBadge = "Ruim";
        }

        return `
            <tr>
                <td style="text-align: center;">
                    <input type="checkbox" class="check-tabela check-registro" value="${item.id}" onchange="atualizarSelecao()">
                </td>
                <td>
                    <div class="data-celula">
                        <strong>${dataDia} às ${dataHora}</strong>
                        <small>Registro #${item.id}</small>
                    </div>
                </td>
                <td>${item.temperatura} °C</td>
                <td>${item.umidade} %</td>
                <td>${item.particulas} µg/m³</td>
                <td><strong>${item.pontuacao} pts</strong></td>
                <td><span class="badge-qualidade ${classeCor}">${textoBadge}</span></td>
                <td style="text-align: center;">
                    <button type="button" class="btn-excluir" onclick="excluirMedicao(${item.id})" title="Apagar este registro">
                        Excluir
                    </button>
                </td>
            </tr>
        `;
    }).join("");

    atualizarSelecao();
}

function filtrarHistorico(categoria, botaoClicado) {
    document.querySelectorAll(".filtro-btn").forEach(btn => btn.classList.remove("ativo"));
    botaoClicado.classList.add("ativo");

    if (categoria === "todas") {
        renderizarTabela(registrosUsuario);
    } else if (categoria === "boa") {
        renderizarTabela(registrosUsuario.filter(item => item.pontuacao >= 5));
    } else if (categoria === "media") {
        renderizarTabela(registrosUsuario.filter(item => item.pontuacao >= 3 && item.pontuacao <= 4));
    } else if (categoria === "ruim") {
        renderizarTabela(registrosUsuario.filter(item => item.pontuacao < 3));
    }
}

function toggleSelecionarTodos(checkboxMestre) {
    const checkboxes = document.querySelectorAll(".check-registro");
    checkboxes.forEach(cb => {
        cb.checked = checkboxMestre.checked;
    });
    atualizarSelecao();
}

function atualizarSelecao() {
    const todosCheckboxes = document.querySelectorAll(".check-registro");
    const selecionados = document.querySelectorAll(".check-registro:checked");
    const btnMassa = document.getElementById("btn-excluir-selecionados");
    const checkTodos = document.getElementById("check-todos");


    todosCheckboxes.forEach(cb => {
        const linha = cb.closest("tr");
        if (linha) {
            linha.classList.toggle("linha-selecionada", cb.checked);
        }
    });


    if (checkTodos) {
        checkTodos.checked = todosCheckboxes.length > 0 && selecionados.length === todosCheckboxes.length;
    }

   
    if (btnMassa) {
        if (selecionados.length > 0) {
            btnMassa.style.display = "inline-block";
            btnMassa.textContent = `Excluir selecionados (${selecionados.length})`;
        } else {
            btnMassa.style.display = "none";
        }
    }
}

async function excluirSelecionados() {
    const selecionados = Array.from(document.querySelectorAll(".check-registro:checked"));
    if (selecionados.length === 0) return;

    const ids = selecionados.map(cb => Number(cb.value));

    if (!confirm(`Deseja realmente excluir ${ids.length} ${ids.length === 1 ? 'medição selecionada' : 'medições selecionadas'}?`)) {
        return;
    }

    const { error } = await db
        .from('medicoes')
        .delete()
        .in('id', ids);

    if (error) {
        alert(`Erro ao excluir registros: ${error.message}`);
        return;
    }

    carregarHistorico();
}

async function excluirMedicao(id) {
    if (!confirm("Deseja realmente excluir esta medição do seu histórico?")) return;

    const { error } = await db
        .from('medicoes')
        .delete()
        .eq('id', id);

    if (error) {
        alert(`Erro ao excluir registro: ${error.message}`);
        return;
    }

    carregarHistorico();
}

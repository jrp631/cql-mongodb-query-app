class QueryExecutor {
    constructor() {
        this.queryInput = document.getElementById('queryInput');
        this.cassandraBtn = document.getElementById('cassandraBtn');
        this.mongodbBtn = document.getElementById('mongodbBtn');
        this.resultContainer = document.getElementById('result');
        
        this.initEventListeners();
    }

    initEventListeners() {
        this.cassandraBtn.addEventListener('click', () => this.executeQuery('cassandra'));
        this.mongodbBtn.addEventListener('click', () => this.executeQuery('mongodb'));
        
        // Ejemplos
        document.querySelectorAll('.example-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const cql = e.target.getAttribute('data-cql');
                const mongo = e.target.getAttribute('data-mongo');
                
                if (cql) {
                    this.queryInput.value = cql;
                } else if (mongo) {
                    this.queryInput.value = mongo;
                }
            });
        });
    }

    async executeQuery(database) {
        const query = this.queryInput.value.trim();
        
        if (!query) {
            this.showError('Por favor, ingrese una consulta');
            return;
        }

        this.setLoading(true);
        this.clearResults();

        try {
            const response = await fetch(`/api/execute/${database}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query })
            });

            const result = await response.json();

            if (result.success) {
                this.showResult(result.data, result.columns, database);
            } else {
                this.showError(result.error);
            }
        } catch (error) {
            this.showError('Error de conexión: ' + error.message);
        } finally {
            this.setLoading(false);
        }
    }

    setLoading(loading) {
        this.cassandraBtn.disabled = loading;
        this.mongodbBtn.disabled = loading;
        
        if (loading) {
            this.cassandraBtn.textContent = 'Ejecutando...';
            this.mongodbBtn.textContent = 'Ejecutando...';
        } else {
            this.cassandraBtn.textContent = 'Ejecutar en Cassandra';
            this.mongodbBtn.textContent = 'Ejecutar en MongoDB';
        }
    }

    clearResults() {
        this.resultContainer.innerHTML = '<p class="placeholder">Los resultados aparecerán aquí...</p>';
    }

    showResult(data, columns = null, database) {
        if (!data || (Array.isArray(data) && data.length === 0)) {
            this.resultContainer.innerHTML = '<p class="success">Consulta ejecutada correctamente. No se encontraron resultados.</p>';
            return;
        }

        let html = '';
        
        if (database === 'cassandra' && columns) {
            // Mostrar resultados de Cassandra como tabla
            html = this.createTable(data, columns);
        } else if (Array.isArray(data)) {
            // Mostrar resultados de MongoDB como tabla si es un array
            if (data.length > 0 && typeof data[0] === 'object') {
                const mongoColumns = Object.keys(data[0]);
                html = this.createTable(data, mongoColumns);
            } else {
                html = this.createSimpleList(data);
            }
        } else if (typeof data === 'object') {
            // Mostrar objeto como JSON formateado
            html = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
        } else {
            html = `<p>${data}</p>`;
        }

        this.resultContainer.innerHTML = html;
    }

    createTable(data, columns) {
        let html = `<table class="result-table"><thead><tr>`;
        
        // Encabezados
        columns.forEach(col => {
            const colName = typeof col === 'object' ? col.name : col;
            html += `<th>${this.escapeHtml(colName)}</th>`;
        });
        html += `</tr></thead><tbody>`;
        
        // Filas
        data.forEach(row => {
            html += `<tr>`;
            columns.forEach(col => {
                const colName = typeof col === 'object' ? col.name : col;
                const value = row[colName];
                html += `<td>${this.escapeHtml(this.formatValue(value))}</td>`;
            });
            html += `</tr>`;
        });
        
        html += `</tbody></table>`;
        return html;
    }

    createSimpleList(data) {
        let html = '<ul>';
        data.forEach(item => {
            html += `<li>${this.escapeHtml(this.formatValue(item))}</li>`;
        });
        html += '</ul>';
        return html;
    }

    formatValue(value) {
        if (value === null || value === undefined) return 'NULL';
        if (typeof value === 'object') return JSON.stringify(value);
        return value.toString();
    }

    escapeHtml(unsafe) {
        return unsafe
            .toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    showError(message) {
        this.resultContainer.innerHTML = `<div class="error">${this.escapeHtml(message)}</div>`;
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new QueryExecutor();
});
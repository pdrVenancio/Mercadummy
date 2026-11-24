
import React, { useState } from 'react';
import {
  Link,
  Routes,
  Route,
  useNavigate,
  useParams
} from 'react-router-dom';
import {
  useQuery,
  useMutation,
  useQueryClient
} from '@tanstack/react-query';

const API = 'http://localhost:3000';

async function api(path: string, opts: any = {}) {
  const r = await fetch(API + path, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers || {})
    },
    ...opts
  });

  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw Error(e.message || 'Ocorreu um erro');
  }

  return r.status === 204 ? null : r.json();
}

const money = (n: number) =>
  '$' + Number(n || 0).toFixed(2);

export default function App() {
  const qc = useQueryClient();

  const me = useQuery({
    queryKey: ['me'],
    queryFn: () => api('/auth/me'),
    retry: false
  });

  const cart = useQuery({
    queryKey: ['cart'],
    queryFn: () => api('/cart'),
    enabled: !!me.data,
    retry: false
  });

  const logout = useMutation({
    mutationFn: () =>
      api('/auth/logout', { method: 'POST' }),
    onSuccess: () => {
      qc.clear();
      location.href = '/';
    }
  });

  return (
    <>
      <header>
        <Link className="brand" to="/">
          Mercadummy
        </Link>

        <nav>
          {me.data ? (
            <>
              <Link to="/orders">Histórico de pedidos</Link>
              <button onClick={() => logout.mutate()}>
                Sair
              </button>
            </>
          ) : (
            <>
              <Link to="/login">Entrar</Link>
              <Link to="/register">Cadastrar</Link>
            </>
          )}

          <Link className="cartlink" to="/cart">
            Carrinho ({cart.data?.count || 0})
          </Link>
        </nav>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products/:id" element={<Product />} />
          <Route path="/login" element={<Auth mode="login" />} />
          <Route path="/register" element={<Auth mode="register" />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/orders" element={<Orders />} />
        </Routes>
      </main>
    </>
  );
}

function Home() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [stock, setStock] = useState(false);
  const [offset, setOffset] = useState(0);

  const q = useQuery({
    queryKey: ['products', search, category, stock, offset],
    queryFn: () =>
      api(
        `/products?search=${encodeURIComponent(search)}&category=${category}&inStock=${stock}&cursor=${offset}&limit=12`
      )
  });

  const cats = useQuery({
    queryKey: ['categories'],
    queryFn: () => api('/categories')
  });

  return (
    <div className="layout">
      <aside>
        <label>
          Buscar
          <input
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setOffset(0);
            }}
            placeholder="Buscar produtos"
          />
        </label>

        <label className="check">
          <input
            type="checkbox"
            checked={stock}
            onChange={e => setStock(e.target.checked)}
          />
          Somente em estoque
        </label>

        <h3>Categorias</h3>

        <label className="check">
          <input
            type="radio"
            name="category"
            checked={!category}
            onChange={() => setCategory('')}
          />
          Todas
        </label>

        {cats.data?.map((c: any) => (
          <label className="check" key={c.id}>
            <input
              type="radio"
              name="category"
              checked={category === c.id}
              onChange={() => setCategory(c.id)}
            />
            {c.nome} ({c.count})
          </label>
        ))}
      </aside>

      <section className="content">
        <h1>Descubra produtos para você</h1>

        {q.isLoading ? (
          <p>Carregando produtos…</p>
        ) : q.isError ? (
          <p className="error">
            {(q.error as Error).message}
          </p>
        ) : (
          <>
            <div className="grid">
              {q.data.items.map((p: any) => (
                <Link
                  className="card"
                  to={'/products/' + p._id}
                  key={p._id}
                >
                  <img
                    src={
                      p.imagemUrl ||
                      'https://placehold.co/600x400?text=Mercadummy'
                    }
                  />

                  <small>{p.categoria?.nome}</small>
                  <b>{p.nome}</b>

                  <span>
                    {p.avaliacao
                      ? `★ ${p.avaliacao}`
                      : 'Sem avaliações'}
                  </span>

                  <strong>
                    {p.descontoPercentual
                      ? money(
                          p.preco *
                            (1 - p.descontoPercentual / 100)
                        )
                      : money(p.preco)}
                  </strong>

                  <em>
                    {p.disponivel
                      ? 'Em estoque'
                      : 'Esgotado'}
                  </em>
                </Link>
              ))}
            </div>

            {!q.data.items.length && (
              <p>Nenhum produto encontrado.</p>
            )}

            <button onClick={() => setOffset(offset + 12)}>
              Carregar mais
            </button>
          </>
        )}
      </section>
    </div>
  );
}

function Product() {
  const { id } = useParams();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ['product', id],
    queryFn: () => api('/products/' + id)
  });

  const [qty, setQty] = useState(1);

  const add = useMutation({
    mutationFn: () =>
      api('/cart/items', {
        method: 'POST',
        body: JSON.stringify({
          produtoId: id,
          quantidade: qty
        })
      }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['cart'] })
  });

  if (q.isLoading) return <p>Carregando…</p>;

  if (q.isError) {
    return <p>{(q.error as Error).message}</p>;
  }

  const p = q.data;

  return (
    <section className="detail">
      <img
        src={
          p.imagens?.[0] ||
          p.imagemUrl ||
          'https://placehold.co/700x500?text=Produto'
        }
      />

      <div>
        <small>{p.categoria?.nome}</small>
        <h1>{p.nome}</h1>

        <p>
          {p.avaliacao
            ? `★ ${p.avaliacao}`
            : 'Sem avaliações'}
        </p>

        <h2>
          {money(
            p.descontoPercentual
              ? p.preco * (1 - p.descontoPercentual / 100)
              : p.preco
          )}
        </h2>

        <p>
          {p.estoqueDisponivel > 0
            ? `${p.estoqueDisponivel} disponíveis`
            : 'Esgotado'}
        </p>

        <div className="row">
          <input
            type="number"
            min="1"
            max={p.estoqueDisponivel}
            value={qty}
            onChange={e => setQty(+e.target.value)}
          />

          <button
            disabled={!p.estoqueDisponivel || add.isPending}
            onClick={() => add.mutate()}
          >
            Adicionar ao carrinho
          </button>
        </div>

        {add.isError && (
          <p className="error">
            {(add.error as Error).message}
          </p>
        )}

        <h3>Descrição</h3>
        <p>{p.descricao}</p>

        <h3>Especificações</h3>

        {Object.entries(p.atributos || {}).map(([k, v]) => (
          <p key={k}>
            {k}: {String(v)}
          </p>
        ))}
      </div>
    </section>
  );
}

function Auth({ mode }: { mode: string }) {
  const register = mode === 'register';
  const nav = useNavigate();
  const qc = useQueryClient();

  const [err, setErr] = useState('');

  const submit = async (e: any) => {
    e.preventDefault();
    setErr('');

    const f = new FormData(e.currentTarget);
    const pass = f.get('senha') as string;

    if (register && pass !== f.get('confirmar')) {
      return setErr('As senhas não coincidem');
    }

    try {
      if (register) {
        await api('/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            nome: f.get('nome'),
            email: f.get('email'),
            senha: pass
          })
        });
      }

      await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: f.get('email'),
          senha: pass
        })
      });

      await qc.invalidateQueries();
      nav('/');
    } catch (x) {
      setErr((x as Error).message);
    }
  };

  return (
    <form className="form" onSubmit={submit}>
      <h1>{register ? 'Criar conta' : 'Entrar'}</h1>

      {register && (
        <input
          name="nome"
          placeholder="Nome completo"
          required
        />
      )}

      <input
        type="email"
        name="email"
        placeholder="Email"
        required
      />

      <input
        type="password"
        name="senha"
        placeholder="Senha"
        minLength={8}
        required
      />

      {register && (
        <input
          type="password"
          name="confirmar"
          placeholder="Confirmar senha"
          required
        />
      )}

      {err && <p className="error">{err}</p>}

      <button>
        {register ? 'Cadastrar' : 'Entrar'}
      </button>
    </form>
  );
}

function Cart() {
  const nav = useNavigate();
  const qc = useQueryClient();

  const me = useQuery({
    queryKey: ['me'],
    queryFn: () => api('/auth/me'),
    retry: false
  });

  const q = useQuery({
    queryKey: ['cart'],
    queryFn: () => api('/cart'),
    enabled: !!me.data,
    retry: false
  });

  const change = useMutation({
    mutationFn: ({ id, quantidade }: any) =>
      api('/cart/items/' + id, {
        method: 'PATCH',
        body: JSON.stringify({ quantidade })
      }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['cart'] })
  });

  const del = useMutation({
    mutationFn: (id: string) =>
      api('/cart/items/' + id, {
        method: 'DELETE'
      }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['cart'] })
  });

  if (!me.data) {
    return (
      <p>
        Entre para acessar o carrinho.{' '}
        <Link to="/login">Entrar</Link>
      </p>
    );
  }

  return (
    <>
      <h1>Seu carrinho</h1>

      {q.isLoading ? (
        <p>Carregando…</p>
      ) : !q.data?.items.length ? (
        <p>Seu carrinho está vazio.</p>
      ) : (
        <>
          <div className="cartitems">
            {q.data.items.map((i: any) => (
              <article key={i.produtoId}>
                <img
                  src={
                    i.produto?.imagemUrl ||
                    'https://placehold.co/100?text=Item'
                  }
                />

                <div>
                  <b>
                    {i.produto?.nome || 'Produto indisponível'}
                  </b>

                  <p>{money(i.subtotal)}</p>

                  {i.indisponivel && (
                    <p className="error">Indisponível</p>
                  )}

                  <button
                    onClick={() =>
                      change.mutate({
                        id: i.produtoId,
                        quantidade: i.quantidade - 1
                      })
                    }
                    disabled={i.quantidade <= 1}
                  >
                    −
                  </button>

                  {' '}{i.quantidade}{' '}

                  <button
                    onClick={() =>
                      change.mutate({
                        id: i.produtoId,
                        quantidade: i.quantidade + 1
                      })
                    }
                  >
                    +
                  </button>

                  <button
                    onClick={() => del.mutate(i.produtoId)}
                  >
                    Remover
                  </button>
                </div>
              </article>
            ))}
          </div>

          <div className="summary">
            <b>Total: {money(q.data.total)}</b>

            <button onClick={() => nav('/checkout')}>
              Ir para o checkout
            </button>
          </div>
        </>
      )}
    </>
  );
}

function Checkout() {
  const nav = useNavigate();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ['cart'],
    queryFn: () => api('/cart'),
    retry: false
  });

  const [error, setError] = useState('');

  const go = useMutation({
    mutationFn: () =>
      api('/orders/checkout', {
        method: 'POST',
        body: JSON.stringify({
          metodoPagamento: 'PIX'
        })
      }),
    onSuccess: (data) => {
      qc.setQueryData(['latestOrder'], data);
      qc.invalidateQueries({ queryKey: ['cart'] });
      nav('/orders');
    }
  });

  return (
    <>
      <h1>Checkout</h1>

      {q.data?.items?.map((i: any) => (
        <p key={i.produtoId}>
          {i.produto?.nome}: {i.quantidade} ×{' '}
          {money(i.produto?.preco)}
        </p>
      ))}

      <h2>Total: {money(q.data?.total)}</h2>

      {(error || go.isError) && (
        <p className="error">
          {error || (go.error as Error).message}
        </p>
      )}

      <button onClick={() => nav('/cart')}>
        Voltar ao carrinho
      </button>

      {' '}

      <button
        disabled={go.isPending || !q.data?.items?.length}
        onClick={() => {
          setError('');
          go.mutate();
        }}
      >
        Confirmar pedido
      </button>
    </>
  );
}

function Orders() {
  const latest = useQuery({
    queryKey: ['latestOrder'],
    queryFn: () => Promise.resolve(null),
    enabled: false
  });

  const q = useQuery({
    queryKey: ['orders'],
    queryFn: () => api('/orders'),
    retry: false,
    refetchInterval: latest.data ? 2000 : false
  });

  const rows = [
    ...(latest.data ? [latest.data] : []),
    ...(q.data || [])
  ].filter(
    (x: any, i: number, a: any[]) =>
      a.findIndex(
        y => y._id === x._id || y.id === x.id
      ) === i
  );

  return (
    <>
      <h1>Histórico de pedidos</h1>

      {q.isLoading ? (
        <p>Carregando…</p>
      ) : q.isError ? (
        <p>Faça login para ver pedidos.</p>
      ) : !rows.length ? (
        <p>Você ainda não fez pedidos.</p>
      ) : (
        rows.map((o: any) => (
          <details
            className="order"
            key={o._id || o.id}
          >
            <summary>
              Pedido {String(o._id || o.id).slice(0, 8)}
              {' · '}
              {new Date(o.criadoEm).toLocaleString('pt-BR')}
              {' · '}
              {o.status}
              {' · '}
              {o.itens?.length || 0} itens
              {' · '}
              {money(o.total)}
            </summary>

            {o.itens?.map((i: any) => (
              <p key={i.produtoId}>
                {i.nome} — {i.qtd} × {money(i.preco)}
              </p>
            ))}
          </details>
        ))
      )}
    </>
  );
}

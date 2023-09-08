class AuroraAplaca {
    constructor(e, t, s, i) {
        this.host = e, this.alpacaKey = t, this.alpacaSecret = s, this.tsDepth = +i, this.nbbo = {}, this.bids = {}, this.asks = {}, (!this.tsDepth || isNaN(this.tsDepth) || this.tsDepth < 1 || 1e3 < this.tsDepth) && (this.tsDepth = 100), this.reconnectInterval = 1e3, this.connected = !1, this._queue = [], this._listeners = {}, this.ts = [], this.l2 = [], this.exchanges = {
            A: "A",
            B: "BX",
            C: "C",
            D: "QD",
            E: "E",
            H: "H",
            I: "IX",
            J: "DA",
            K: "DX",
            L: "L",
            M: "MW",
            N: "N",
            P: "PA",
            Q: "Q",
            S: "QS",
            T: "QT",
            U: "U",
            V: "V",
            W: "W",
            X: "X",
            Y: "BY",
            Z: "BZ"
        };
        this.connect()
    }

    isBusinessDay(e) {
        let t = e.getDay();
        return !(t === 0 || t === 6)
    }

    fetchPrints(i, a, n, r) {
        i = Terminal.tinkoffTickerToUS(i);
        let o = this;
        return new Promise(s => {
            if (isAlpaca === false) {
                s({trades: []})
            } else {
                let e;
                let t = "https://data.alpaca.markets/v2/stocks/" + i + "/trades?limit=10000&start=" + a;
                if (n) {
                    t += "&page_token=" + n
                }
                fetch(t, {
                    headers: {
                        "APCA-API-KEY-ID": this.alpacaKey,
                        "APCA-API-SECRET-KEY": this.alpacaSecret
                    }
                }).then(function (e) {
                    e.json().then(e => {
                        if (e.next_page_token) {
                            s(o.fetchPrints(i, a, e.next_page_token, e.trades || []))
                        } else {
                            if (r !== undefined && r.length > 0) {
                                e.trades.unshift.apply(e.trades, r)
                            }
                            s(e)
                        }
                    })
                })
            }
        })
    }

    subscribeTS(i) {
        i = Terminal.tinkoffTickerToUS(i);
        var a, n, e, r, o, l;
        return new Promise(s => {
            if ((a = new Date).setMinutes(a.getMinutes() - 5), n = a.toISOString().split(".")[0] + ".00000000Z", a.getUTCHours() < 9) {
                for (; a.setDate(a.getDate() - 1), !this.isBusinessDay(a);) ;
                a.setUTCHours(21), a.setUTCMinutes(0), a.setUTCSeconds(0), n = a.toISOString().split(".")[0] + ".00000000Z"
            }
            this.fetchPrints(i, n).then(t => {
                let e = [];
                if (t === undefined || t.trades === undefined || t.trades === null || t.trades.length === 0) {
                    for (; a.setDate(a.getDate() - 1), !this.isBusinessDay(a);) ;
                    a.setUTCHours(21), a.setUTCMinutes(0), a.setUTCSeconds(0), n = a.toISOString().split(".")[0] + ".00000000Z";
                    e.push(this.fetchPrints(i, n))
                }
                Promise.all(e).then(e => {
                    if (e[0] !== undefined) {
                        t = e[0]
                    }
                    for (t = (t.trades || []).slice(Math.max((t.trades || []).length - this.tsDepth, 0)), r = 0, o = t; r < o.length; r++) {
                        l = o[r];
                        Widgets.messageAction({
                            type: "aa",
                            depth: this.tsDepth,
                            history: !0,
                            data: Object.assign({T: "t", S: i}, l)
                        })
                    }
                    s(-1 === this.ts.indexOf(i) && (this.ts.push(i), this.send(JSON.stringify({
                        action: "subscribe",
                        trades: [i],
                        quotes: [i]
                    }))))
                })
            })
        })
    }

    unsubscribeTS(e) {
        e = Terminal.tinkoffTickerToUS(e);
        let t = this.ts.indexOf(e);
        if (t > -1) {
            this.ts.splice(t, 1);
            this.send(JSON.stringify({action: "unsubscribe", trades: [e]}))
        }
    }

    fetchLatestQuote(e, t) {
        return new Promise(t => {
            if (isAlpaca === false) {
                t({quote: {bp: 0, qp: 0, bs: 0, as: 0}})
            } else {
                fetch("https://data.alpaca.markets/v2/stocks/" + e + "/quotes/latest", {
                    headers: {
                        "APCA-API-KEY-ID": this.alpacaKey,
                        "APCA-API-SECRET-KEY": this.alpacaSecret
                    }
                }).then(function (e) {
                    e.json().then(e => {
                        t(e)
                    })
                })
            }
        })
    }

    subscribeL2(t) {
        t = Terminal.tinkoffTickerToUS(t);
        this.fetchLatestQuote(t).then(e => {
            if (e.quote) {
                e.quote.T = "q";
                e.quote.S = t;
                this.nbbo[t] = {bid: e.quote.bp || 0, ask: e.quote.ap || 0};
                if (this.bids[t] === undefined) {
                    this.bids[t] = {};
                    this.bids[t][e.quote.bx] = {
                        bid: e.quote.bp || 0,
                        bidSize: 100 * (e.quote.bs || 0)
                    }
                }
                if (this.asks[t] === undefined) {
                    this.asks[t] = {};
                    this.asks[t][e.quote.ax] = {
                        ask: e.quote.ap || 0,
                        askSize: 100 * (e.quote.as || 0)
                    }
                }
                Widgets.messageAction({
                    type: "aa",
                    depth: this.tsDepth,
                    history: true,
                    data: e.quote
                });
                if (this.l2.indexOf(t) === -1) {
                    this.l2.push(t);
                    this.send(JSON.stringify({action: "subscribe", quotes: [t]}))
                }
            }
        })
    }

    unsubscribeL2(e) {
        e = Terminal.tinkoffTickerToUS(e);
        let t = this.l2.indexOf(e);
        if (t > -1) {
            this.l2.splice(t, 1);
            this.send(JSON.stringify({action: "unsubscribe", quotes: [e]}))
        }
    }

    resubscribe() {
        for (var e = 0, t = this.ts; e < t.length; e++) {
            var s = t[e];
            this.send(JSON.stringify({
                action: "unsubscribe",
                trades: [s]
            })), this.send(JSON.stringify({action: "subscribe", trades: [s]}))
        }
        for (var i = 0, a = this.l2; i < a.length; i++) {
            s = a[i];
            this.send(JSON.stringify({
                action: "unsubscribe",
                quotes: [s]
            })), this.send(JSON.stringify({action: "subscribe", quotes: [s]}))
        }
    }

    auth() {
        this.send(JSON.stringify({action: "auth", key: this.alpacaKey, secret: this.alpacaSecret}))
    }

    emit(e, t) {
        if (void 0 === t && (t = this), void 0 === this._listeners[e]) return this;
        for (var s = this._listeners[e].length; s--;) this._listeners[e][s](t);
        return this
    }

    once(s, i) {
        var a = this;
        this.on(s, function e(t) {
            i(t), a.off(s, e)
        })
    }

    on(e, t) {
        void 0 === this._listeners[e] && (this._listeners[e] = []), this._listeners[e].push(t)
    }

    off(e, t) {
        if (void 0 === t && (t = !1), void 0 === this._listeners[e] && (this._listeners[e] = []), !t) return delete this._listeners[e], this;
        t = this._listeners[e].indexOf(t);
        return -1 !== t && this._listeners[e].splice(t, 1), this
    }

    connect() {
        var t = this;
        this._socket = new WebSocket(this.host), this._socket.onmessage = function (e) {
            return t.onMessage(e)
        }, this._socket.onclose = function (e) {
            return t.onClose(e)
        }, this._socket.onerror = function (e) {
            return t.onError(e)
        }, this._socket.onopen = function (e) {
            return t.onConnect(e)
        }
    }

    disconnect() {
        clearTimeout(this._rTimeout), this._socket.close()
    }

    reconnect() {
        var e = this;
        0 !== this.reconnectInterval && (this._rTimeout || (this.emit("reconnect"), this._rTimeout = setTimeout(function () {
            e.connect(), e.resubscribe(), clearTimeout(e._rTimeout), e._rTimeout = void 0
        }, this.reconnectInterval)))
    }

    onConnect() {
        this.connected = !0, this.auth()
    }

    onError(e) {
        this.emit("error", e), this.connected = !1, this.reconnect()
    }

    onClose(e) {
        this.emit("close", e), this.connected = !1, this.reconnect()
    }

    onMessage(t) {
        try {
            this.emit("message", t.data);
            let e = JSON.parse(t.data);
            if (e.find(function (e) {
                return "authenticated" === e.msg
            })) {
                for (var s; s = this._queue.shift();) this.send(s);
                this.emit("connected")
            } else {
                e.forEach(e => {
                    let t = "";
                    if (e?.S !== undefined) {
                        t = Terminal.usTickerToTinkoff(e.S)
                    }
                    if (t !== "" && e.T === "q") {
                        this.nbbo[t] = {bid: e.bp || 0, ask: e.ap || 0};
                        if (e.bp > 0) {
                            if (isAlpaca === false) {
                            } else {
                                this.bids[t] = {}
                            }
                            if (this.bids[t] === undefined) {
                                this.bids[t] = {}
                            }
                            this.bids[t][e.bx] = {bid: e.bp || 0, bidSize: 100 * (e.bs || 0)}
                        }
                        if (e.ap > 0) {
                            if (isAlpaca === false) {
                                if (this.asks[t] === undefined) {
                                    this.asks[t] = {}
                                }
                            } else {
                                this.asks[t] = {}
                            }
                            this.asks[t][e.ax] = {ask: e.ap || 0, askSize: 100 * (e.as || 0)}
                        }
                    }
                    Widgets.messageAction({type: "aa", depth: this.tsDepth, data: e})
                })
            }
        } catch (t) {
            console.error(t)
        }
    }

    send(e) {
        !1 !== this.connected ? this._socket.send(e) : this._queue.push(e)
    }

    exchangeTransition(e) {
        return this.exchanges[e] || "-"
    }

    static togglePrintsSubscribe(e, t, s) {
        if (s === undefined) {
            s = "";
            if (!window.__tradingExtAlpaca) {
                return setTimeout(function () {
                    return AuroraAplaca.togglePrintsSubscribe(e, t)
                }, 500)
            }
        } else {
            s = s.trim();
            if (Widgets.getWidgets(s.trim(), "TS").length === 0) {
                window.__tradingExtAlpaca.unsubscribeTS(s.trim())
            }
        }
        if (t) {
            window.__tradingExtAlpaca.unsubscribeTS(t.trim());
            window.__tradingExtAlpaca.subscribeTS(t.trim())
        }
    }

    static toggleOrderbookSubscribe(e, t, s) {
        if (s === undefined) {
            if (!window.__tradingExtAlpaca) {
                return setTimeout(function () {
                    return AuroraAplaca.toggleOrderbookSubscribe(e, t)
                }, 500)
            }
        } else {
            s = s.trim();
            if (Widgets.getWidgets(s.trim(), "L2").length === 0) {
                window.__tradingExtAlpaca.unsubscribeL2(s.trim())
            }
        }
        if (t) {
            window.__tradingExtAlpaca.unsubscribeL2(t.trim());
            window.__tradingExtAlpaca.subscribeL2(t.trim())
        }
    }
}

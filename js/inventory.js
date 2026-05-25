// ============================================================
// inventory.js — Backpack / Item Inventory
// All gacha results go here; player uses items manually.
// ============================================================

// FB-7: Inventory slot expansion config
const INVENTORY_SLOT_CONFIG = {
    baseSlots: 20,           // Default free slots
    maxSlots: 50,            // Maximum expandable slots
    slotsPerUnlock: 5,       // Slots gained per unlock
    baseDiamondCost: 10,     // First unlock cost in diamonds
    costIncrement: 5         // Cost increase per unlock
};

class InventorySystem {
    constructor(game) {
        this.game = game;
        this.items = {};
        this.maxSlots = INVENTORY_SLOT_CONFIG.baseSlots; // FB-7: current max capacity
        this.panelEl = document.getElementById('inventory-sheet');
        this.listEl = document.getElementById('inventory-list');
        this.badgeEl = document.getElementById('inventory-badge');
    }

    openSheet() {
        if (this.panelEl) { this.panelEl.classList.add('open'); this.renderItems(); }
    }

    closeSheet() {
        if (this.panelEl) { this.panelEl.classList.remove('open'); }
    }

    addItem(gachaItem) {
        // FB-7: Check capacity before adding
        if (this.getTotalCount() >= this.maxSlots) {
            if (this.game.effects) this.game.effects.showToast(I18n.t('inventory.full'), 'info');
            return false;
        }
        const id = gachaItem.id;
        this.items[id] = (this.items[id] || 0) + 1;
        this.updateBadge();
        if (this.panelEl && this.panelEl.classList.contains('open')) {
            this.renderItems();
        }
        return true;
    }

    // FB-7: Get diamond cost for next slot unlock
    getUnlockCost() {
        const unlocksDone = Math.floor((this.maxSlots - INVENTORY_SLOT_CONFIG.baseSlots) / INVENTORY_SLOT_CONFIG.slotsPerUnlock);
        return INVENTORY_SLOT_CONFIG.baseDiamondCost + unlocksDone * INVENTORY_SLOT_CONFIG.costIncrement;
    }

    // FB-7: Unlock additional slots with diamonds
    unlockSlot() {
        if (this.maxSlots >= INVENTORY_SLOT_CONFIG.maxSlots) {
            if (this.game.effects) this.game.effects.showToast(I18n.t('inventory.maxSlotsReached'), 'info');
            return false;
        }
        const cost = this.getUnlockCost();
        if (!this.game.currency || this.game.currency.diamonds < cost) {
            if (this.game.effects) this.game.effects.showToast(I18n.t('inventory.notEnoughDiamonds'), 'info');
            return false;
        }
        this.game.currency.spendDiamonds(cost);
        this.maxSlots = Math.min(this.maxSlots + INVENTORY_SLOT_CONFIG.slotsPerUnlock, INVENTORY_SLOT_CONFIG.maxSlots);
        if (this.game.effects) this.game.effects.showToast(I18n.t('inventory.slotsUnlocked', { count: INVENTORY_SLOT_CONFIG.slotsPerUnlock, cost: cost }), 'ssr');
        this.renderItems();
        if (this.game.save) this.game.save.saveAll();
        return true;
    }

    // FB-7: Check if more slots can be unlocked
    canUnlockMore() {
        return this.maxSlots < INVENTORY_SLOT_CONFIG.maxSlots;
    }

    removeItem(id) {
        if (!this.items[id] || this.items[id] <= 0) return false;
        this.items[id]--;
        if (this.items[id] <= 0) delete this.items[id];
        this.updateBadge();
        return true;
    }

    refundItem(id) {
        this.items[id] = (this.items[id] || 0) + 1;
        this.updateBadge();
    }

    updateBadge() {
        const total = this.getTotalCount();
        if (this.badgeEl) {
            this.badgeEl.textContent = total;
            this.badgeEl.style.display = total > 0 ? 'flex' : 'none';
        }
    }

    getTotalCount() {
        return Object.values(this.items).reduce((s, n) => s + n, 0);
    }

    findPoolItem(id) {
        return GACHA_POOL_V2.find(g => g.id === id) 
            || GACHA_POOL.find(g => g.id === id) 
            || SHOP_ITEMS.find(g => g.id === id);
    }

    renderItems() {
        if (!this.listEl) return;
        this.listEl.innerHTML = '';

        const itemIds = Object.keys(this.items).filter(id => this.items[id] > 0);
        const uniqueItemsCount = itemIds.length;

        // 1. Render actual items
        for (let i = 0; i < uniqueItemsCount; i++) {
            const id = itemIds[i];
            const count = this.items[id];
            const poolItem = this.findPoolItem(id);
            if (!poolItem) continue;

            const card = document.createElement('div');
            const rarity = poolItem.rarity || 'R';
            card.className = 'inventory-card rarity-' + rarity.toLowerCase();
            card.dataset.itemId = id;

            // Select state restoration
            if (this._selectedItemId === id) {
                card.classList.add('selected');
            }

            const iconEl = document.createElement('span');
            iconEl.className = 'inventory-icon';
            iconEl.textContent = poolItem.icon;
            card.appendChild(iconEl);

            if (count > 1) {
                const countBadge = document.createElement('span');
                countBadge.className = 'inventory-count-badge';
                countBadge.textContent = '×' + count;
                card.appendChild(countBadge);
            }

            // Click to select/view info
            card.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectItem(id, card);
            });

            // Pointer down for drag & drop
            card.addEventListener('pointerdown', (e) => {
                this.onPointerDown(e, id);
            });

            this.listEl.appendChild(card);
        }

        // 2. Render empty slots to reach this.maxSlots
        const emptySlotsCount = Math.max(0, this.maxSlots - uniqueItemsCount);
        for (let i = 0; i < emptySlotsCount; i++) {
            const emptyCard = document.createElement('div');
            emptyCard.className = 'inventory-card empty-slot';
            this.listEl.appendChild(emptyCard);
        }

        // 3. Render locked slots up to Max Config (50 slots)
        if (this.maxSlots < INVENTORY_SLOT_CONFIG.maxSlots) {
            const lockedSlotsCount = INVENTORY_SLOT_CONFIG.maxSlots - this.maxSlots;
            for (let i = 0; i < lockedSlotsCount; i++) {
                const lockedCard = document.createElement('div');
                lockedCard.className = 'inventory-card locked-slot';
                lockedCard.textContent = '🔒';
                
                // Clicking a locked slot triggers slot expansion confirmation!
                lockedCard.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.unlockSlot();
                });
                this.listEl.appendChild(lockedCard);
            }
        }
    }

    selectItem(id, cardEl) {
        this._selectedItemId = id;
        document.querySelectorAll('.inventory-card').forEach(c => c.classList.remove('selected'));
        if (cardEl) cardEl.classList.add('selected');
        
        const poolItem = this.findPoolItem(id);
        if (poolItem) {
            this.showInventoryItemInfo(poolItem);
        }
    }

    showInventoryItemInfo(poolItem) {
        const infoTextEl = document.getElementById('item-info-text');
        const sellBtnEl = document.getElementById('item-sell-btn');
        const infoBarEl = document.getElementById('item-info-bar');
        
        if (infoTextEl) {
            const desc = poolItem.description || this.getEffectDescription(poolItem);
            infoTextEl.textContent = `${poolItem.icon} ${poolItem.name} — ${desc}`;
            infoTextEl.removeAttribute('data-i18n');
        }
        if (sellBtnEl) {
            sellBtnEl.style.display = 'none';
        }
        if (infoBarEl) {
            infoBarEl.classList.add('has-item');
        }
        
        // Clear board selection highlight
        document.querySelectorAll('.grid-cell.cell-highlight').forEach(c => c.classList.remove('cell-highlight'));
        if (this.game.board) {
            this.game.board._selectedCellIndex = null;
        }
    }

    // Pointer events — Drag & drop from backpack panel to board
    onPointerDown(e, id) {
        e.preventDefault();
        e.stopPropagation(); // Prevent bubbling up to document and triggering sheet close
        const sx = e.clientX;
        const sy = e.clientY;
        let lastX = sx;
        let lastY = sy;
        let isDragging = false;
        let dragGhost = null;

        const onMove = (ev) => {
            // Cache coordinates as robust touch fallback
            if (ev.clientX !== undefined && ev.clientX !== 0) lastX = ev.clientX;
            if (ev.clientY !== undefined && ev.clientY !== 0) lastY = ev.clientY;

            if (!isDragging) {
                if (Math.abs(ev.clientX - sx) > 8 || Math.abs(ev.clientY - sy) > 8) {
                    isDragging = true;
                    document.body.classList.add('inventory-dragging');
                    const poolItem = this.findPoolItem(id);
                    if (poolItem) {
                        dragGhost = document.createElement('div');
                        dragGhost.className = 'inventory-drag-ghost';
                        dragGhost.textContent = poolItem.icon;
                        dragGhost.style.left = ev.clientX + 'px';
                        dragGhost.style.top = ev.clientY + 'px';
                        document.body.appendChild(dragGhost);
                        
                        // Select on drag start
                        const cardEl = document.querySelector(`.inventory-card[data-item-id="${id}"]`);
                        this.selectItem(id, cardEl);
                    }
                }
            }

            if (isDragging && dragGhost) {
                dragGhost.style.left = ev.clientX + 'px';
                dragGhost.style.top = ev.clientY + 'px';

                const t = document.elementFromPoint(ev.clientX, ev.clientY);
                document.querySelectorAll('.grid-cell.drop-target').forEach(c => c.classList.remove('drop-target'));
                
                if (t) {
                    const gc = t.closest('.grid-cell');
                    if (gc) {
                        gc.classList.add('drop-target');
                    }
                }
            }
        };

        const onUp = (ev) => {
            document.removeEventListener('pointermove', onMove);
            document.removeEventListener('pointerup', onUp);

            // Compute accurate coordinate with lastX/lastY fallback
            const upX = (ev.clientX !== undefined && ev.clientX !== 0) ? ev.clientX : lastX;
            const upY = (ev.clientY !== undefined && ev.clientY !== 0) ? ev.clientY : lastY;

            if (isDragging) {
                if (dragGhost) {
                    dragGhost.remove();
                    dragGhost = null;
                }
                document.querySelectorAll('.grid-cell.drop-target').forEach(c => c.classList.remove('drop-target'));

                const t = document.elementFromPoint(upX, upY);
                document.body.classList.remove('inventory-dragging');
                
                let cellFound = false;
                if (t) {
                    const gc = t.closest('.grid-cell');
                    if (gc) {
                        const targetCellIndex = parseInt(gc.dataset.index);
                        this.useItem(id, targetCellIndex);
                        cellFound = true;
                    }
                }
                if (!cellFound) {
                    const dragOutsideText = (I18n.t('inventory.dragOutside') && I18n.t('inventory.dragOutside') !== 'inventory.dragOutside')
                        ? I18n.t('inventory.dragOutside')
                        : '请将物品拖拽到棋盘格子内！';
                    this.showUseToast(dragOutsideText);
                }
            } else {
                // If it is just a click/touch tap, select the item and show details!
                const cardEl = document.querySelector(`.inventory-card[data-item-id="${id}"]`);
                this.selectItem(id, cardEl);
            }
            isDragging = false;
        };

        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
    }

    getEffectDescription(poolItem) {
        switch (poolItem.effect) {
            case 'add_fragment': return I18n.t('inventory.descAddFragment');
            case 'add_fragment_lucky': return I18n.t('inventory.descAddFragmentLucky');
            case 'add_energy_item': return I18n.t('inventory.descAddEnergyItem', {energy: (poolItem.value && poolItem.value.energy) || '?'});
            case 'spawn_board_item': return I18n.t('inventory.descSpawnBoardItem');
            case 'place_generator': return I18n.t('inventory.descPlaceGenerator');
            case 'ssr_generator': return I18n.t('inventory.descSSRGenerator');
            case 'add_joker': return I18n.t('inventory.descAddJoker');
            case 'add_scissor': return I18n.t('inventory.descAddScissor');
            case 'clear_lv1': return I18n.t('inventory.descClearLv1');
            case 'spawn_item': return I18n.t('inventory.descSpawnItem');
            case 'time_freeze': return I18n.t('inventory.descTimeFreeze');
            case 'lucky_coin': return I18n.t('inventory.descLuckyCoin');
            case 'double_gen': return I18n.t('inventory.descDoubleGen');
            case 'reroll': return I18n.t('inventory.descReroll');
            case 'gen_refresh': return I18n.t('inventory.descGenRefresh');
            case 'add_diamond': return I18n.t('inventory.descAddDiamond', {amount: (poolItem.value && poolItem.value.amount) || '?'});
            case 'add_gold': return I18n.t('inventory.descAddGold', {amount: (poolItem.value && poolItem.value.amount) || '?'});
            case 'space_clean': return I18n.t('inventory.descSpaceClean');
            case 'upgrade_item': return I18n.t('inventory.descUpgradeItem');
            default: return I18n.t('inventory.descDefault');
        }
    }

    useItem(id, targetCellIndex = null) {
        const poolItem = this.findPoolItem(id);
        if (!poolItem) return;

        // Space validation for placeable items only when not dragging to a specific grid cell
        if (targetCellIndex === null && this._needsBoardSpace(poolItem.effect)) {
            if (!this.game.board.hasEmptySpace()) {
                this.showUseToast(I18n.t('inventory.boardFullUse') || '棋盘已满，无法放置！');
                return;
            }
        }

        // Try removing the item, if effect execution fails we refund it
        if (!this.removeItem(id)) return;

        let used = true;
        switch (poolItem.effect) {
            case 'add_fragment': used = this.effectAddFragment(poolItem.value); break;
            case 'add_fragment_lucky': used = this.effectAddFragmentLucky(poolItem.value); break;
            case 'add_energy_item': used = this.effectAddEnergy(poolItem.value); break;
            case 'spawn_board_item': used = this.effectSpawnBoardItem(poolItem.value, targetCellIndex); break;
            case 'place_generator': used = this.effectPlaceGenerator(poolItem.value, targetCellIndex); break;
            case 'ssr_generator': used = this.effectSSRGenerator(poolItem.value, targetCellIndex); break;
            case 'add_joker': used = this.effectPlaceJoker(targetCellIndex); break;
            case 'add_scissor': used = this.effectScissorMode(id, targetCellIndex); break;
            case 'clear_lv1': used = this.effectClearLv1(); break;
            case 'spawn_item': used = this.effectSpawnItem(poolItem.value, targetCellIndex); break;
            case 'time_freeze': used = this.effectTimeFreeze(poolItem.value); break;
            case 'lucky_coin': used = this.effectLuckyCoin(poolItem.value); break;
            case 'double_gen': used = this.effectDoubleGen(poolItem.value); break;
            case 'reroll': used = this.effectReroll(poolItem.value); break;
            case 'gen_refresh': used = this.effectGenRefresh(); break;
            case 'add_diamond': used = this.effectAddDiamond(poolItem.value); break;
            case 'add_gold': used = this.effectAddGold(poolItem.value); break;
            case 'space_clean': used = this.effectSpaceClean(); break;
            case 'upgrade_item': used = this.effectUpgradeItem(id, targetCellIndex); break;
            default: this.showUseToast(I18n.t('inventory.usedItem', {name: poolItem.name}));
        }

        if (!used) {
            this.refundItem(id);
        }

        this.renderItems();
        if (used && this.panelEl) Effects.spawnParticles(this.panelEl, 6, '✨');

        // Refresh board quest completion highlights
        if (used) {
            this.game.checkOrderCompletion();
            if (this.game.dailyOrders) this.game.dailyOrders.updateHighlights();
        }

        if (this.game.save) this.game.save.saveAll();
    }

    updateBadge() {
        const total = this.getTotalCount();
        if (this.badgeEl) {
            this.badgeEl.textContent = total;
            this.badgeEl.style.display = total > 0 ? 'flex' : 'none';
        }

        const backpackBtn = document.getElementById('backpack-btn');
        if (backpackBtn) {
            const itemIds = Object.keys(this.items).filter(id => this.items[id] > 0);
            if (itemIds.length > 0) {
                const firstPoolItem = this.findPoolItem(itemIds[0]);
                if (firstPoolItem) {
                    backpackBtn.innerHTML = `<span class="backpack-item-icon">${firstPoolItem.icon}</span>` +
                        `<span id="inventory-badge" class="backpack-badge">${total}</span>`;
                }
            } else {
                backpackBtn.innerHTML = `<span class="backpack-item-icon">📦</span>` +
                    `<span id="inventory-badge" class="backpack-badge" style="display: none;">0</span>`;
            }
            this.badgeEl = document.getElementById('inventory-badge');
        }
    }

    _needsBoardSpace(effect) {
        return ['spawn_board_item', 'place_generator', 'ssr_generator', 'add_joker'].includes(effect);
    }

    effectAddFragment(value) {
        if (this.game.fragmentSystem && value) {
            let chain = value.chain;
            if (chain === 'random' && typeof CHAINS !== 'undefined' && CHAINS.length > 0) {
                chain = CHAINS[Math.floor(Math.random() * CHAINS.length)];
            }
            this.game.fragmentSystem.addFragment(chain, value.genLevel, value.count);
            this.showUseToast(I18n.t('inventory.fragmentAdded', {count: value.count}));
        } else {
            this.showUseToast(I18n.t('inventory.fragmentAdded', {count: (value && value.count) || 1}));
        }
        return true;
    }

    effectAddFragmentLucky(value) {
        if (this.game.fragmentSystem && value) {
            this.game.fragmentSystem.addFragment(value.chain, Math.random() < 0.7 ? 1 : 2, value.count);
            this.showUseToast(I18n.t('inventory.luckyFragmentAdded', {count: value.count}));
        } else {
            this.showUseToast(I18n.t('inventory.luckyFragmentAdded', {count: (value && value.count) || 1}));
        }
        return true;
    }

    effectAddEnergy(value) {
        if (value && value.energy) {
            this.game.energy.recover(value.energy);
            this.showUseToast(I18n.t('inventory.energyRecovered', {count: value.energy}));
        }
        return true;
    }

    effectSpawnBoardItem(value, targetCellIndex = null) {
        const board = this.game.board;
        let spawnIdx = targetCellIndex;
        if (spawnIdx !== null) {
            if (board.locked.has(spawnIdx) || board.cells[spawnIdx]) {
                this.showUseToast(I18n.t('inventory.cellOccupied') || '该格子已占用或已锁定！');
                return false;
            }
        } else {
            spawnIdx = board.findEmptyCell();
            if (spawnIdx === -1) {
                this.showUseToast(I18n.t('inventory.boardFullPlace') || '棋盘已满！');
                return false;
            }
        }

        let chain = value.chain, level = value.level;
        if (chain === 'random') chain = CHAINS[Math.floor(Math.random() * CHAINS.length)];
        if (typeof level === 'string') {
            if (level === 'random_1_2') level = Math.random() < 0.6 ? 1 : 2;
            else if (level === 'random_1_3') { const r = Math.random(); level = r < 0.4 ? 1 : r < 0.8 ? 2 : 3; }
            else if (level === 'random_3_4') level = Math.random() < 0.6 ? 3 : 4;
            else if (level === 'random_3_5') { const r = Math.random(); level = r < 0.5 ? 3 : r < 0.85 ? 4 : 5; }
            else level = 3;
        }
        const prefix = CHAIN_ITEM_PREFIX[chain];
        if (!prefix) return false;
        const itemId = prefix + '_' + level;

        board.logic.setCell(spawnIdx, itemId);
        board.logic.initGeneratorState(spawnIdx, itemId);
        board.renderCell(spawnIdx);
        Effects.spawnPop(board.getCellEl(spawnIdx));

        this.showUseToast(I18n.t('inventory.gotItem', {name: ITEMS[itemId] ? ITEMS[itemId].name : itemId}));
        return true;
    }

    effectPlaceGenerator(value, targetCellIndex = null) {
        const board = this.game.board;
        let spawnIdx = targetCellIndex;
        if (spawnIdx !== null) {
            if (board.locked.has(spawnIdx) || board.cells[spawnIdx]) {
                this.showUseToast(I18n.t('inventory.cellOccupied') || '该格子已占用或已锁定！');
                return false;
            }
        } else {
            spawnIdx = board.findEmptyCell();
            if (spawnIdx === -1) {
                this.showUseToast(I18n.t('inventory.boardFullPlace') || '棋盘已满！');
                return false;
            }
        }

        const genId = value.genChain + '_' + value.level;
        if (ITEMS[genId]) {
            board.logic.setCell(spawnIdx, genId);
            board.logic.initGeneratorState(spawnIdx, genId);
            board.renderCell(spawnIdx);
            Effects.spawnPop(board.getCellEl(spawnIdx));
            this.showUseToast(I18n.t('inventory.gotGenerator', {name: ITEMS[genId].name}));
            return true;
        }
        this.showUseToast(I18n.t('inventory.generatorError'));
        return false;
    }

    effectSSRGenerator(value, targetCellIndex = null) {
        const board = this.game.board;
        let spawnIdx = targetCellIndex;
        if (spawnIdx !== null) {
            if (board.locked.has(spawnIdx) || board.cells[spawnIdx]) {
                this.showUseToast(I18n.t('inventory.cellOccupied') || '该格子已占用或已锁定！');
                return false;
            }
        } else {
            spawnIdx = board.findEmptyCell();
            if (spawnIdx === -1) {
                this.showUseToast(I18n.t('inventory.boardFullSSR') || '棋盘已满！');
                return false;
            }
        }

        const genId = value.genChain + '_' + value.level;
        if (ITEMS[genId]) {
            board.logic.setCell(spawnIdx, genId);
            board.logic.initGeneratorState(spawnIdx, genId);
            board.renderCell(spawnIdx);
            Effects.spawnPop(board.getCellEl(spawnIdx));
            this.showUseToast(I18n.t('inventory.ssrPlaced', {name: ITEMS[genId].name}));
            return true;
        }
        this.showUseToast(I18n.t('inventory.ssrGeneratorError'));
        return false;
    }

    effectClearLv1() {
        const board = this.game.board;
        let cleared = 0;
        let totalEnergy = 0;
        for (let i = 0; i < board.cells.length; i++) {
            if (board.cells[i]) {
                const item = ITEMS[board.cells[i]];
                if (item && parseInt(item.level) === 1 && item.type !== 'GENERATOR' && item.type !== 'JOKER' && item.type !== 'SCISSOR') {
                    const energyAmt = board.logic.getRecycleEnergy(i);
                    totalEnergy += energyAmt;
                    board.removeItem(i);
                    Effects.spawnParticles(board.getCellEl(i), 2, '🧹');
                    cleared++;
                }
            }
        }
        if (cleared > 0) {
            this.game.energy.recover(totalEnergy);
            this.showUseToast(I18n.t('inventory.clearedLv1', {count: cleared}));
        } else {
            this.showUseToast(I18n.t('inventory.noLv1ToClear'));
        }
        return true;
    }

    effectSpawnItem(level, targetCellIndex = null) {
        const board = this.game.board;
        let spawnIdx = targetCellIndex;
        if (spawnIdx !== null) {
            if (board.locked.has(spawnIdx) || board.cells[spawnIdx]) {
                this.showUseToast(I18n.t('inventory.cellOccupied') || '该格子已占用或已锁定！');
                return false;
            }
        } else {
            spawnIdx = board.findEmptyCell();
            if (spawnIdx === -1) {
                this.showUseToast(I18n.t('inventory.boardFullUse2') || '棋盘已满！');
                return false;
            }
        }

        const candidates = Object.entries(ITEMS).filter(function(e) { return e[1].level === level; });
        if (candidates.length === 0) return false;
        const entry = candidates[Math.floor(Math.random() * candidates.length)];
        const itemId = entry[0];

        board.logic.setCell(spawnIdx, itemId);
        board.logic.initGeneratorState(spawnIdx, itemId);
        board.renderCell(spawnIdx);
        Effects.spawnPop(board.getCellEl(spawnIdx));

        const itemData = ITEMS[itemId];
        this.showUseToast(I18n.t('inventory.gotSpawnItem', {emoji: itemData.emoji, name: itemData.name}));
        return true;
    }

    effectTimeFreeze(seconds) {
        this.game._timeFreezeBonus = (this.game._timeFreezeBonus || 0) + seconds;
        this.showUseToast(I18n.t('inventory.timeFreezeUsed', {seconds: seconds}));
        return true;
    }

    effectLuckyCoin(value) {
        const count = (typeof value === 'object' && value !== null) ? (value.count || 1) : (value || 1);
        this.game._luckyCoinsLeft = (this.game._luckyCoinsLeft || 0) + count;
        this.showUseToast(I18n.t('inventory.luckyCoinUsed', {count: count}));
        return true;
    }

    effectDoubleGen(value) {
        const turns = (value && value.turns) || 3;
        this.game._doubleGenTurns = (this.game._doubleGenTurns || 0) + turns;
        this.showUseToast(I18n.t('inventory.doubleGenUsed', {turns: turns}));
        return true;
    }

    effectReroll(value) {
        const board = this.game.board;
        const count = (value && value.count) || 3;
        const candidates = [];
        for (let i = 0; i < board.cells.length; i++) {
            if (board.cells[i]) {
                const item = ITEMS[board.cells[i]];
                if (item && item.type !== 'GENERATOR' && item.type !== 'JOKER' && item.type !== 'SCISSOR' && item.chain) {
                    candidates.push(i);
                }
            }
        }
        if (candidates.length === 0) {
            this.showUseToast(I18n.t('inventory.noRerollTarget'));
            return false;
        }
        const shuffled = candidates.sort(function() { return Math.random() - 0.5; });
        const toReroll = shuffled.slice(0, Math.min(count, shuffled.length));
        let rerolled = 0;
        for (const idx of toReroll) {
            const oldItem = ITEMS[board.cells[idx]];
            if (!oldItem || !oldItem.nextId) continue;
            const otherChains = CHAINS.filter(function(c) { return c !== oldItem.chain; });
            const newChain = otherChains[Math.floor(Math.random() * otherChains.length)];
            const prefix = CHAIN_ITEM_PREFIX[newChain];
            if (!prefix) continue;
            const newItemId = prefix + '_' + oldItem.level;
            if (ITEMS[newItemId]) {
                board.logic.setCell(idx, newItemId);
                board.renderCell(idx);
                Effects.spawnParticles(board.getCellEl(idx), 3, '🔄');
                rerolled++;
            }
        }
        if (rerolled > 0) {
            this.showUseToast(I18n.t('inventory.rerolled', {count: rerolled}));
            if (this.game.dailyOrders) this.game.dailyOrders.updateHighlights();
        } else {
            this.showUseToast(I18n.t('inventory.noRerollItems'));
        }
        return true;
    }

    effectGenRefresh() {
        const board = this.game.board;
        let refreshed = 0;
        if (board.generatorStates) {
            for (const idx in board.generatorStates) {
                if (board.generatorStates[idx] && board.generatorStates[idx].cooldownUntil) {
                    board.generatorStates[idx].cooldownUntil = 0;
                    refreshed++;
                }
            }
        }
        if (refreshed > 0) {
            this.showUseToast(I18n.t('inventory.genRefreshed', {count: refreshed}));
        } else {
            this.showUseToast(I18n.t('inventory.noGenToRefresh'));
        }
        return true;
    }

    effectAddDiamond(value) {
        const amount = (value && value.amount) || 50;
        if (this.game.currency) {
            this.game.currency.addDiamonds(amount);
            this.showUseToast(I18n.t('inventory.diamondAdded', {count: amount}));
        } else {
            this.showUseToast(I18n.t('inventory.diamondAddedNoSystem', {count: amount}));
        }
        return true;
    }

    effectAddGold(value) {
        const amount = (value && value.amount) || 500;
        if (this.game.currency) {
            this.game.currency.addGold(amount);
            this.showUseToast(I18n.t('inventory.goldAdded', {count: amount}));
        } else {
            this.showUseToast(I18n.t('inventory.goldAddedNoSystem', {count: amount}));
        }
        return true;
    }

    effectSpaceClean() {
        const board = this.game.board;
        let cleared = 0;
        for (let i = 0; i < board.cells.length; i++) {
            if (board.cells[i]) {
                const item = ITEMS[board.cells[i]];
                if (item && (Number(item.level) === 1 || Number(item.level) === 2) && item.type !== 'GENERATOR' && item.type !== 'JOKER' && item.type !== 'SCISSOR') {
                    const energyAmt = board.logic.getRecycleEnergy(i);
                    board.removeItem(i);
                    if (energyAmt > 0) this.game.energy.recover(energyAmt);
                    cleared++;
                }
            }
        }
        if (cleared > 0) {
            this.showUseToast(I18n.t('inventory.spaceCleaned', {count: cleared}));
        } else {
            this.showUseToast(I18n.t('inventory.noSpaceToClean'));
        }
        return true;
    }

    effectUpgradeItem(itemId, targetCellIndex = null) {
        const board = this.game.board;
        
        // If a target cell index is provided (e.g. from drag & drop), immediately try to upgrade that item!
        if (targetCellIndex !== null) {
            const cellItemId = board.cells[targetCellIndex];
            if (!cellItemId) {
                this.showUseToast(I18n.t('inventory.itemNotUpgradable') || '该位置为空，无法升级！');
                return false;
            }
            const itemData = ITEMS[cellItemId];
            if (!itemData || !itemData.nextId || itemData.type === 'GENERATOR' || itemData.type === 'JOKER' || itemData.type === 'SCISSOR') {
                this.showUseToast(I18n.t('inventory.itemNotUpgradable') || '此物品无法升级！');
                return false;
            }
            const nextItem = ITEMS[itemData.nextId];
            if (nextItem) {
                board.logic.setCell(targetCellIndex, itemData.nextId);
                board.renderCell(targetCellIndex);
                Effects.mergePopAt(board.getCellEl(targetCellIndex));
                this.showUseToast(I18n.t('inventory.upgradeSuccess', {oldName: itemData.name, newName: nextItem.name}));
                if (this.game.collection) this.game.collection.discoverItem(itemData.nextId);
                if (this.game.dailyOrders) this.game.dailyOrders.updateHighlights();
                this.closeSheet();
                if (this.game.save) this.game.save.saveAll();
                return true;
            } else {
                this.showUseToast(I18n.t('inventory.maxLevelReached') || '已达最高等级！');
                return false;
            }
        }

        // Always trigger interactive upgrade mode to let players choose precisely!
        let hasUpgradable = false;
        for (let i = 0; i < board.cells.length; i++) {
            if (board.cells[i]) {
                const item = ITEMS[board.cells[i]];
                if (item && item.nextId && item.type !== 'GENERATOR' && item.type !== 'JOKER' && item.type !== 'SCISSOR') {
                    hasUpgradable = true;
                    break;
                }
            }
        }
        if (!hasUpgradable) {
            this.showUseToast(I18n.t('inventory.noUpgradeTarget'));
            return false;
        }
        this.showUseToast(I18n.t('inventory.upgradeHint'));
        this.closeSheet();
        const gridEl = document.getElementById('game-grid');
        if (gridEl) gridEl.classList.add('scissor-active');
        const self = this;
        const handler = function(e) {
            const cell = e.target.closest('.grid-cell');
            if (!cell) return;
            const idx = parseInt(cell.dataset.index);
            const cellItemId = board.cells[idx];
            if (!cellItemId) return;
            const itemData = ITEMS[cellItemId];
            if (!itemData || !itemData.nextId || itemData.type === 'GENERATOR' || itemData.type === 'JOKER' || itemData.type === 'SCISSOR') {
                self.showUseToast(I18n.t('inventory.itemNotUpgradable'));
                self.refundItem(itemId);
                self.renderItems();
            } else {
                const nextItem = ITEMS[itemData.nextId];
                if (nextItem) {
                    board.logic.setCell(idx, itemData.nextId);
                    board.renderCell(idx);
                    Effects.mergePopAt(board.getCellEl(idx));
                    self.showUseToast(I18n.t('inventory.upgradeSuccess', {oldName: itemData.name, newName: nextItem.name}));
                    if (self.game.collection) self.game.collection.discoverItem(itemData.nextId);
                    if (self.game.dailyOrders) self.game.dailyOrders.updateHighlights();
                } else {
                    self.showUseToast(I18n.t('inventory.maxLevelReached'));
                    self.refundItem(itemId);
                    self.renderItems();
                }
            }
            if (gridEl) gridEl.classList.remove('scissor-active');
            document.removeEventListener('click', handler, true);
            if (self.game.save) self.game.save.saveAll();
        };
        setTimeout(function() { document.addEventListener('click', handler, true); }, 100);
        setTimeout(function() {
            if (gridEl && gridEl.classList.contains('scissor-active')) {
                gridEl.classList.remove('scissor-active');
                document.removeEventListener('click', handler, true);
                self.refundItem(itemId);
                self.renderItems();
                self.showUseToast(I18n.t('inventory.upgradeCancelled'));
            }
        }, 10000);
        return true;
    }

    effectPlaceJoker(targetCellIndex = null) {
        const board = this.game.board;
        let spawnIdx = targetCellIndex;
        if (spawnIdx !== null) {
            if (board.locked.has(spawnIdx) || board.cells[spawnIdx]) {
                this.showUseToast(I18n.t('inventory.cellOccupied') || '该格子已占用或已锁定！');
                return false;
            }
        } else {
            spawnIdx = board.findEmptyCell();
            if (spawnIdx === -1) {
                this.showUseToast(I18n.t('inventory.boardFullJoker'));
                return false;
            }
        }
        board.logic.setCell(spawnIdx, 'joker');
        board.logic.initGeneratorState(spawnIdx, 'joker');
        board.renderCell(spawnIdx);
        Effects.spawnPop(board.getCellEl(spawnIdx));
        this.showUseToast(I18n.t('inventory.jokerPlaced'));
        return true;
    }

    effectScissorMode(itemId, targetCellIndex = null) {
        const board = this.game.board;
        
        // If a target cell index is provided (e.g. from drag & drop), immediately try to split that item!
        if (targetCellIndex !== null) {
            const result = board.logic.useScissorOnItem(targetCellIndex);
            if (result.success) {
                board.renderCell(result.targetIdx);
                board.renderCell(result.emptyIdx);
                Effects.mergePopAt(board.getCellEl(result.targetIdx));
                const prevData = ITEMS[result.resultItems[0]];
                this.showUseToast(I18n.t('inventory.scissorSuccess', {name: prevData ? prevData.name : ''}));
                if (this.game.collection) this.game.collection.discoverItem(result.resultItems[0]);
                if (this.game.dailyOrders) this.game.dailyOrders.updateHighlights();
                this.closeSheet();
                if (this.game.save) this.game.save.saveAll();
                return true;
            } else {
                const reasons = {
                    'empty': I18n.t('inventory.scissorFailEmpty'),
                    'too_low': I18n.t('inventory.scissorFailTooLow'),
                    'invalid_type': I18n.t('inventory.scissorFailInvalidType'),
                    'no_space': I18n.t('inventory.scissorFailNoSpace')
                };
                this.showUseToast('✂️ ' + (reasons[result.reason] || I18n.t('inventory.scissorFailDefault') || '无法拆分！'));
                return false;
            }
        }

        // Always trigger interactive scissor selection mode to let players choose precisely!
        board.logic.scissorMode = true;
        this.showUseToast(I18n.t('inventory.scissorHint'));
        this.closeSheet();
        const gridEl = document.getElementById('game-grid');
        if (gridEl) gridEl.classList.add('scissor-active');
        const self = this;
        const handler = function(e) {
            const cell = e.target.closest('.grid-cell');
            if (!cell) return;
            const idx = parseInt(cell.dataset.index);
            const result = board.logic.useScissorOnItem(idx);
            if (result.success) {
                board.renderCell(result.targetIdx);
                board.renderCell(result.emptyIdx);
                Effects.mergePopAt(board.getCellEl(result.targetIdx));
                const prevData = ITEMS[result.resultItems[0]];
                self.showUseToast(I18n.t('inventory.scissorSuccess', {name: prevData ? prevData.name : ''}));
                if (self.game.collection) self.game.collection.discoverItem(result.resultItems[0]);
                if (self.game.dailyOrders) self.game.dailyOrders.updateHighlights();
            } else {
                const reasons = {
                    'empty': I18n.t('inventory.scissorFailEmpty'),
                    'too_low': I18n.t('inventory.scissorFailTooLow'),
                    'invalid_type': I18n.t('inventory.scissorFailInvalidType'),
                    'no_space': I18n.t('inventory.scissorFailNoSpace')
                };
                self.showUseToast('✂️ ' + (reasons[result.reason] || I18n.t('inventory.scissorFailDefault')));
                self.refundItem(itemId);
                self.renderItems();
            }
            board.logic.scissorMode = false;
            if (gridEl) gridEl.classList.remove('scissor-active');
            document.removeEventListener('click', handler, true);
            if (self.game.save) self.game.save.saveAll();
        };
        setTimeout(function() { document.addEventListener('click', handler, true); }, 100);
        setTimeout(function() {
            if (board.logic.scissorMode) {
                board.logic.scissorMode = false;
                if (gridEl) gridEl.classList.remove('scissor-active');
                document.removeEventListener('click', handler, true);
                self.refundItem(itemId);
                self.renderItems();
                self.showUseToast(I18n.t('inventory.scissorCancelled'));
            }
        }, 10000);
        return true;
    }

    showUseToast(text) {
        const toast = document.createElement('div');
        toast.className = 'daily-toast';
        toast.textContent = text;
        (document.getElementById('toast-root') || document.body).appendChild(toast);
        requestAnimationFrame(function() { toast.classList.add('show'); });
        setTimeout(function() {
            toast.classList.remove('show');
            setTimeout(function() { toast.remove(); }, 300);
        }, 2500);
    }
}

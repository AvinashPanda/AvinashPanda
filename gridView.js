import {api, LightningElement, track} from "lwc";

const delay = 300;
const pageNumber = 1;
const hideIt = "visibility:hidden";
const showIt = "visibility:visible";
const recordsPerPage = [10, 25, 50, 100];

export default class GridView extends LightningElement {
    @api
    get columns() {
        return this._columns;
    }

    set columns(value) {
        this._columns = value;
    }

    @api
    get records() {
        return this._data;
    }

    set records(value) {
        this._data = value;
        this._recordsToDisplay = this._data;
        this._totalRecords = this._data.length;
        if (this._pageSizeOptions && this._pageSizeOptions.length > 0) {
            this._pageSize = this._pageSizeOptions[0];
        } else {
            this._pageSize = this._totalRecords;
            this.showPagination = false;
        }
        this._controlPagination = this.showPagination === false ? hideIt : showIt;
        this.calculateOrderSummary();
        this.setRecordsToDisplay();
    }

    @api
    get enableEditAction() {
        return this._editAction;
    }

    set enableEditAction(value) {
        this._editAction = value;
    }

    @api
    get enableDeleteAction() {
        return this._deleteAction;
    }

    set enableDeleteAction(value) {
        this._deleteAction = value;
        if (value) {
            let deleteColumns = JSON.parse(JSON.stringify(this._columns));
            deleteColumns.push({
                type: "button-icon",
                typeAttributes: {iconName: "utility:delete", name: "delete", iconClass: "slds-icon-text-error"},
                fixedWidth: 50
            });
            this._columns = deleteColumns;
        }
    }

    @api
    get disableCheckboxColumn() {
        return this._hideCheckboxColumn;
    }

    set disableCheckboxColumn(value) {
        this._hideCheckboxColumn = value;
    }

    @api
    get enableSearchBox() {
        return this._showSearchBox;
    }

    set enableSearchBox(value) {
        this._showSearchBox = value;
    }

    @api
    get enableRowNumberColumn() {
        return this._showRowNumberColumn;
    }

    set enableRowNumberColumn(value) {
        this._showRowNumberColumn = value;
    }

    @api
    get enableGridPagination() {
        return this._showGridPagination;
    }

    set enableGridPagination(value) {
        this._showGridPagination = value;
    }

    @api
    get enableGridSummary() {
        return this._showGridSummary;
    }

    set enableGridSummary(value) {
        this._showGridSummary = value;
    }

    @api
    get preSelectedRows() {
        return this._preSelectedRows;
    }

    set preSelectedRows(value) {
        this._preSelectedRows = value;
        this._currentSelectedRows = this._preSelectedRows;
    }

    @track _hideCheckboxColumn = false;
    @track _showRowNumberColumn = false;
    @track _defaultSortDirection = "desc";
    @track _sortDirection = "desc";
    @track _sortedBy = "createdDate";
    @track _maxLinesToWrap = "4";
    @track _showSearchBox = false;
    @track _showGridPagination = false;
    @track _showGridSummary = false;
    @track _pageSizeOptions = recordsPerPage;
    @track _subTotal = 0.0;
    @track _discount = 0.0;
    @track _total = 0.0;
    @track _columns = [];
    @track _data = [];
    @track _editAction = false;
    @track _deleteAction = false;
    @track _recordsToDisplay = [];
    @track _pageSize;
    @track _totalPages;
    @track _searchKey;
    @track _totalRecords;
    @track _pageNumber = pageNumber;
    @track _controlPagination = showIt;
    @track _controlPrevious = hideIt;
    @track _controlNext = showIt;
    @track _delayTimeout = delay;
    @track _showGridView = true;
    @track _preSelectedRows = [];
    @track _currentSelectedRows = [];
    @track showPagination;
    @track tempRow = {};
    @track editIndex = 0;

    handleRowAction(event) {
        this.deleteSelectedRow(event.detail.row);
    }

    calculateOrderSummary() {
        this._total = 0.0;
        this._discount = 0.0;
        this._subTotal = 0.0;
        this._data.reduce((accumulator, currentValue) => {
            if (currentValue.hasOwnProperty('discount')) {
                this._discount += parseInt(currentValue.discount);
            } else if(currentValue.hasOwnProperty('Discount')){
                this._discount += parseInt(currentValue.Discount);
            }
            if (currentValue.hasOwnProperty('total')) {
                this._subTotal += parseInt(currentValue.total);
            } else if (currentValue.hasOwnProperty('totalPrice')) {
                this._subTotal += parseInt(currentValue.totalPrice);
            } else if (currentValue.hasOwnProperty('TotalPrice')) {
                this._subTotal += parseInt(currentValue.TotalPrice);
            }
        }, true);
        this._total = this._subTotal - this._discount;
    }

    handleCellChange(event) {
        this.dispatchEvent(new CustomEvent("cellchangecomplete", {
            detail: {
                type: "CellChangeComplete",
                value: event.detail.draftValues
            }
        }));
    }

    handleRowSelection(event) {
        let checked = event.detail.checked;
        if (checked){
            this._currentSelectedRows = [...this._currentSelectedRows];
            this._preSelectedRows = [...this._preSelectedRows];
            event.detail.selectedRows.reduce((accumulator, currentValue) => {
                if (currentValue.uid) {
                    this._preSelectedRows.push(currentValue.uid);
                    this._currentSelectedRows.push(currentValue.uid);
                }
            }, true);
        }

        this.dispatchEvent(new CustomEvent("rowselectioncomplete", {
            detail: {
                type: "RowSelectionComplete",
                value: event.detail.selectedRows
            }
        }));
    }

    handleSave(event) {
        let newData = JSON.parse(JSON.stringify(this._data));
        const draftValues = event.detail.draftValues;
        draftValues.forEach(element => {
            this.editindex = this._data.findIndex(row => row.uid === element.uid);
            this.tempRow = {...this._data[this.editindex]};
            if (element.hasOwnProperty('quantity') && element.hasOwnProperty('price')) {
                this.tempRow.quantity = element.quantity
                this.tempRow.price = element.price
                this.tempRow.total = element.quantity * element.price;
            } else if (element.hasOwnProperty('price')) {
                this.tempRow.price = element.price
                this.tempRow.total = this.tempRow.quantity * element.price;
            } else {
                this.tempRow.quantity = element.quantity
                this.tempRow.total = element.quantity * this.tempRow.price;
            }
            newData[this.editindex] = this.tempRow;
        });
        this.tempRow = {};
        this._data = newData;
        this._recordsToDisplay = this._data;
        this.setRecordsToDisplay();
        this.calculateOrderSummary();
        this.dispatchEvent(new CustomEvent("savecomplete", {
            detail: {
                type: "SaveComplete",
                value: draftValues
            }
        }));
        this.draftValues = {};
    }

    handleDeleteSelectedRow(deleteRow) {
        this.dispatchEvent(new CustomEvent("deleteselectedrowcomplete", {detail: { value: deleteRow } }));
    }

    handleGridSort(event) {
        const {fieldName: _sortedBy, _sortDirection} = event.detail;
        const cloneData = [...this._data];
        cloneData.sort(this.handleSortedBy(_sortedBy, _sortDirection === "asc" ? 1 : -1));
        this._data = cloneData;
        this._sortDirection = _sortDirection;
        this._sortedBy = _sortedBy;
        this.setRecordsToDisplay();
    }

    handleSortedBy(field, reverse, primer) {
        const keyPrimer = primer
            ? function (x) {
                return primer(x[field]);
            }
            : function (x) {
                return x[field];
            };

        return function (a, b) {
            a = keyPrimer(a);
            b = keyPrimer(b);
            return reverse * ((a > b) - (b > a));
        };
    }

    deleteSelectedRow(deleteRow) {
        let agree = confirm("Are you sure you wish to delete this record ?");
        if (agree) {
            let newData = JSON.parse(JSON.stringify(this._data));
            newData = newData.filter((row) => row.uid !== deleteRow.uid);
            newData.forEach((element, index) => (element.uid = index + 1));
            this._data = newData;
            this._recordsToDisplay = this._data;
            this.setRecordsToDisplay();
            this.calculateOrderSummary();
            this.handleDeleteSelectedRow(deleteRow);
        }
    }

    handleRecordsPerPage(event) {
        this._pageSize = event.target.value;
        this.setRecordsToDisplay();
    }

    handlePageNumberChange(event) {
        if (event.keyCode === 13) {
            this._pageNumber = event.target.value;
            this.setRecordsToDisplay();
        }
    }

    handlePreviousPage() {
        this._pageNumber = this._pageNumber - 1;
        this.setRecordsToDisplay();
    }

    handleNextPage() {
        this._pageNumber = this._pageNumber + 1;
        this.setRecordsToDisplay();
    }

    setRecordsToDisplay() {
        this._recordsToDisplay = [];
        this._currentSelectedRows = [];
        if (!this._pageSize) this._pageSize = this._totalRecords;

        this._totalPages = Math.ceil(this._totalRecords / this._pageSize);
        this.setPaginationControls();
        for (let i = (this._pageNumber - 1) * this._pageSize; i < this._pageNumber * this._pageSize; i++) {
            if (i === this._totalRecords) break;
            this._recordsToDisplay.push(this._data[i]);
            this._preSelectedRows.forEach(element => {
                if (this._data[i].uid === element) {
                    this._currentSelectedRows.push(this._data[i].uid);
                }
            });
        }
        this.handlePaginatorChange(new CustomEvent("paginatorchange", {detail: this._recordsToDisplay}));
    }

    setPaginationControls() {
        if (this._totalPages === 1) {
            this._controlPrevious = hideIt;
            this._controlNext = hideIt;
        } else if (this._totalPages > 1) {
            this._controlPrevious = showIt;
            this._controlNext = showIt;
        }

        if (this._pageNumber <= 1) {
            this._pageNumber = 1;
            this._controlPrevious = hideIt;
        } else if (this._pageNumber >= this._totalPages) {
            this._pageNumber = this._totalPages;
            this._controlNext = hideIt;
        }

        if (this._controlPagination === hideIt) {
            this._controlPrevious = hideIt;
            this._controlNext = hideIt;
        }
    }

    handlePaginatorChange(event) {
        this._recordsToDisplay = event.detail;
    }

    handleKeyChange(event) {
        window.clearTimeout(this._delayTimeout);
        const searchKey = event.target.value;
        if (searchKey) {
            this._delayTimeout = setTimeout(() => {
                this._controlPagination = hideIt;
                this.setPaginationControls();

                this._searchKey = searchKey;
                this._recordsToDisplay = this._data.filter((rec) => JSON.stringify(rec).toLowerCase().includes(searchKey.toLowerCase()));
                if (Array.isArray(this._recordsToDisplay) && this._recordsToDisplay.length > 0)
                    this.handlePaginatorChange(new CustomEvent("paginatorchange", {detail: this._recordsToDisplay}));
            }, delay);
        } else {
            this._controlPagination = showIt;
            this.setRecordsToDisplay();
        }
    }
}

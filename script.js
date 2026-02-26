let currentUser = null;
const STORAGE_KEY = 'ipt_demo_v1';

function getDefaultData() {
    return {
        accounts: [
            {
                id: 1,
                firstName: 'Admin',
                lastName: 'User',
                email: 'admin@example.com',
                password: 'Password123!',
                role: 'Admin',
                verified: true
            }
        ],
        departments: [
            { id: 1, name: 'Engineering', description: 'Software development and engineering team' },
            { id: 2, name: 'HR', description: 'Human resources and recruitment' }
        ],
        employees: [],
        requests: []
    };
}

function loadFromStorage() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) {
            window.db = JSON.parse(data);
            if (!window.db.accounts) window.db.accounts = [];
            if (!window.db.departments) window.db.departments = [];
            if (!window.db.employees) window.db.employees = [];
            if (!window.db.requests) window.db.requests = [];
        } else {
            window.db = getDefaultData();
            saveToStorage();
        }
    } catch (e) {
        window.db = getDefaultData();
        saveToStorage();
    }
}

function saveToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(window.db));
}

function showToast(message, type) {
    type = type || 'info';
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(function() {
        toast.classList.add('toast-fade');
        setTimeout(function() { toast.remove(); }, 400);
    }, 3000);
}

function navigateTo(hash) {
    window.location.hash = hash;
}

function handleRouting() {
    let hash = window.location.hash || '#/';
    if (!hash || hash === '#') hash = '#/';

    const pageName = hash.substring(2) || 'home';
    const pageId = pageName + '-page';

    const protectedRoutes = ['profile', 'requests', 'employees', 'accounts', 'departments'];
    const adminRoutes = ['employees', 'accounts', 'departments'];

    if (protectedRoutes.includes(pageName) && !currentUser) {
        navigateTo('#/login');
        return;
    }
    if (adminRoutes.includes(pageName) && (!currentUser || currentUser.role !== 'Admin')) {
        showToast('Access Denied. Admin Only', 'error');
        navigateTo('#/profile');
        return;
    }

    document.querySelectorAll('.page').forEach(function(page) {
        page.classList.remove('active');
    });

    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
    } else {
        document.getElementById('home-page').classList.add('active');
    }

    if (pageName === 'profile' && currentUser) renderProfile();
    if (pageName === 'verify-email') {
        const email = localStorage.getItem('unverified_email');
        if (email) document.getElementById('verifyEmailDisplay').textContent = email;
    }
    if (pageName === 'accounts') renderAccountsList();
    if (pageName === 'departments') renderDepartmentsList();
    if (pageName === 'employees') renderEmployeesTable();
    if (pageName === 'requests') renderRequestsList();
}

window.addEventListener('hashchange', handleRouting);

function setAuthState(isAuth, user) {
    if (isAuth && user) {
        currentUser = user;
        document.body.classList.add('authenticated');
        document.body.classList.remove('not-authenticated');
        if (user.role === 'Admin') {
            document.body.classList.add('is-admin');
        } else {
            document.body.classList.remove('is-admin');
        }
        document.getElementById('userDropdown').textContent = user.firstName + ' ' + user.lastName + ' \u25BC';
    } else {
        currentUser = null;
        document.body.classList.remove('authenticated', 'is-admin');
        document.body.classList.add('not-authenticated');
        document.getElementById('userDropdown').textContent = 'Username \u25BC';
    }
}

function handleRegistration() {
    const firstName = document.getElementById('regFirstName').value.trim();
    const lastName = document.getElementById('regLastName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;

    if (!firstName || !lastName || !email || !password) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    if (password.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
    }
    if (window.db.accounts.some(function(acc) { return acc.email === email; })) {
        showToast('Email already registered', 'error');
        return;
    }

    window.db.accounts.push({
        id: Date.now(),
        firstName: firstName,
        lastName: lastName,
        email: email,
        password: password,
        role: 'User',
        verified: false
    });
    saveToStorage();

    localStorage.setItem('unverified_email', email);
    document.getElementById('verifyEmailDisplay').textContent = email;
    document.getElementById('registerForm').reset();
    showToast('Account created! Please verify your email.', 'success');
    navigateTo('#/verify-email');
}

function simulateEmailVerification() {
    const unverifiedEmail = localStorage.getItem('unverified_email');
    if (!unverifiedEmail) {
        showToast('No email to verify', 'error');
        return;
    }
    const account = window.db.accounts.find(function(acc) { return acc.email === unverifiedEmail; });
    if (account) {
        account.verified = true;
        saveToStorage();
        localStorage.removeItem('unverified_email');
        showToast('Email verified! You can now login.', 'success');
        navigateTo('#/login');
    } else {
        showToast('Account not found', 'error');
    }
}

function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const alertDiv = document.getElementById('loginAlert');
    alertDiv.innerHTML = '';

    if (!email || !password) {
        alertDiv.innerHTML = '<div class="alert alert-danger">Please fill in all fields</div>';
        return;
    }

    const account = window.db.accounts.find(function(acc) {
        return acc.email === email && acc.password === password && acc.verified === true;
    });

    if (account) {
        localStorage.setItem('auth_token', account.email);
        setAuthState(true, account);
        document.getElementById('loginForm').reset();
        alertDiv.innerHTML = '';
        showToast('Login successful!', 'success');
        navigateTo('#/profile');
    } else {
        const unverified = window.db.accounts.find(function(acc) {
            return acc.email === email && acc.password === password && !acc.verified;
        });
        if (unverified) {
            alertDiv.innerHTML = '<div class="alert alert-warning">Please verify your email first.</div>';
        } else {
            alertDiv.innerHTML = '<div class="alert alert-danger">Invalid email or password.</div>';
        }
    }
}

function handleLogout() {
    localStorage.removeItem('auth_token');
    setAuthState(false);
    showToast('Logged out successfully', 'success');
    navigateTo('#/');
}

function renderProfile() {
    if (currentUser) {
        document.getElementById('profileName').textContent = currentUser.firstName + ' ' + currentUser.lastName;
        document.getElementById('profileEmail').textContent = currentUser.email;
        document.getElementById('profileRole').textContent = currentUser.role;
    }
}

let editingAccountId = null;

function renderAccountsList() {
    const tbody = document.getElementById('accountsBody');
    tbody.innerHTML = '';
    window.db.accounts.forEach(function(acc) {
        const tr = document.createElement('tr');
        tr.innerHTML =
            '<td>' + acc.firstName + ' ' + acc.lastName + '</td>' +
            '<td>' + acc.email + '</td>' +
            '<td>' + acc.role + '</td>' +
            '<td>' + (acc.verified ? '\u2714' : '\u2014') + '</td>' +
            '<td>' +
                '<button class="btn-sm btn-edit" data-id="' + acc.id + '">Edit</button> ' +
                '<button class="btn-sm btn-warn" data-id="' + acc.id + '">Reset PW</button> ' +
                '<button class="btn-sm btn-danger" data-id="' + acc.id + '">Delete</button>' +
            '</td>';
        tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.btn-edit').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var id = Number(btn.getAttribute('data-id'));
            editAccount(id);
        });
    });

    tbody.querySelectorAll('.btn-warn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var id = Number(btn.getAttribute('data-id'));
            resetAccountPassword(id);
        });
    });

    tbody.querySelectorAll('.btn-danger').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var id = Number(btn.getAttribute('data-id'));
            deleteAccount(id);
        });
    });
}

function showAccountForm(account) {
    document.getElementById('accountForm').style.display = 'block';
    if (account) {
        editingAccountId = account.id;
        document.getElementById('accFirstName').value = account.firstName;
        document.getElementById('accLastName').value = account.lastName;
        document.getElementById('accEmail').value = account.email;
        document.getElementById('accPassword').value = '';
        document.getElementById('accRole').value = account.role;
        document.getElementById('accVerified').checked = account.verified;
        document.getElementById('accEmail').disabled = true;
    } else {
        editingAccountId = null;
        document.getElementById('accFirstName').value = '';
        document.getElementById('accLastName').value = '';
        document.getElementById('accEmail').value = '';
        document.getElementById('accPassword').value = '';
        document.getElementById('accRole').value = 'User';
        document.getElementById('accVerified').checked = false;
        document.getElementById('accEmail').disabled = false;
    }
}

function hideAccountForm() {
    document.getElementById('accountForm').style.display = 'none';
    editingAccountId = null;
    document.getElementById('accEmail').disabled = false;
}

function saveAccount() {
    var firstName = document.getElementById('accFirstName').value.trim();
    var lastName = document.getElementById('accLastName').value.trim();
    var email = document.getElementById('accEmail').value.trim();
    var password = document.getElementById('accPassword').value;
    var role = document.getElementById('accRole').value;
    var verified = document.getElementById('accVerified').checked;

    if (!firstName || !lastName || !email) {
        showToast('Please fill in required fields', 'error');
        return;
    }

    if (editingAccountId) {
        var acc = window.db.accounts.find(function(a) { return a.id === editingAccountId; });
        if (acc) {
            acc.firstName = firstName;
            acc.lastName = lastName;
            acc.role = role;
            acc.verified = verified;
            if (password && password.length >= 6) acc.password = password;
            showToast('Account updated', 'success');
        }
    } else {
        if (!password || password.length < 6) {
            showToast('Password must be at least 6 characters', 'error');
            return;
        }
        if (window.db.accounts.some(function(a) { return a.email === email; })) {
            showToast('Email already exists', 'error');
            return;
        }
        window.db.accounts.push({
            id: Date.now(),
            firstName: firstName,
            lastName: lastName,
            email: email,
            password: password,
            role: role,
            verified: verified
        });
        showToast('Account created', 'success');
    }
    saveToStorage();
    hideAccountForm();
    renderAccountsList();
}

function editAccount(id) {
    var acc = window.db.accounts.find(function(a) { return a.id === id; });
    if (acc) showAccountForm(acc);
}

function resetAccountPassword(id) {
    var newPw = prompt('Enter new password (min 6 characters):');
    if (newPw && newPw.length >= 6) {
        var acc = window.db.accounts.find(function(a) { return a.id === id; });
        if (acc) {
            acc.password = newPw;
            saveToStorage();
            showToast('Password reset successfully', 'success');
        }
    } else if (newPw !== null) {
        showToast('Password must be at least 6 characters', 'error');
    }
}

function deleteAccount(id) {
    if (currentUser && currentUser.id === id) {
        showToast('Cannot delete your own account', 'error');
        return;
    }
    if (confirm('Are you sure you want to delete this account?')) {
        window.db.accounts = window.db.accounts.filter(function(a) { return a.id !== id; });
        saveToStorage();
        showToast('Account deleted', 'success');
        renderAccountsList();
    }
}

let editingDeptId = null;

function renderDepartmentsList() {
    var tbody = document.getElementById('departmentsBody');
    tbody.innerHTML = '';
    window.db.departments.forEach(function(dept) {
        var tr = document.createElement('tr');
        tr.innerHTML =
            '<td>' + dept.name + '</td>' +
            '<td>' + dept.description + '</td>' +
            '<td><button class="btn-sm btn-edit" data-id="' + dept.id + '">Edit</button> ' +
            '<button class="btn-sm btn-danger" data-id="' + dept.id + '">Delete</button></td>';
        tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.btn-edit').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var id = Number(btn.getAttribute('data-id'));
            editDept(id);
        });
    });

    tbody.querySelectorAll('.btn-danger').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var id = Number(btn.getAttribute('data-id'));
            deleteDept(id);
        });
    });
}

function showDeptForm(dept) {
    document.getElementById('departmentForm').style.display = 'block';
    if (dept) {
        editingDeptId = dept.id;
        document.getElementById('deptName').value = dept.name;
        document.getElementById('deptDescription').value = dept.description;
    } else {
        editingDeptId = null;
        document.getElementById('deptName').value = '';
        document.getElementById('deptDescription').value = '';
    }
}

function hideDeptForm() {
    document.getElementById('departmentForm').style.display = 'none';
    editingDeptId = null;
}

function saveDept() {
    var name = document.getElementById('deptName').value.trim();
    var description = document.getElementById('deptDescription').value.trim();

    if (!name) {
        showToast('Department name is required', 'error');
        return;
    }

    if (editingDeptId) {
        var dept = window.db.departments.find(function(d) { return d.id === editingDeptId; });
        if (dept) {
            dept.name = name;
            dept.description = description;
        }
    } else {
        window.db.departments.push({
            id: Date.now(),
            name: name,
            description: description
        });
    }
    saveToStorage();
    hideDeptForm();
    renderDepartmentsList();
    showToast(editingDeptId ? 'Department updated' : 'Department added', 'success');
}

function editDept(id) {
    var dept = window.db.departments.find(function(d) { return d.id === id; });
    if (dept) showDeptForm(dept);
}

function deleteDept(id) {
    if (confirm('Delete this department?')) {
        window.db.departments = window.db.departments.filter(function(d) { return d.id !== id; });
        saveToStorage();
        showToast('Department deleted', 'success');
        renderDepartmentsList();
    }
}

function addDepartment() {
    alert('Not implemented');
}

let editingEmployeeIdx = null;

function renderEmployeesTable() {
    var tbody = document.getElementById('employeesBody');
    tbody.innerHTML = '';

    window.db.employees.forEach(function(emp, idx) {
        var dept = window.db.departments.find(function(d) { return d.id === emp.deptId; });
        var tr = document.createElement('tr');
        tr.innerHTML =
            '<td>' + emp.employeeId + '</td>' +
            '<td>' + emp.email + '</td>' +
            '<td>' + emp.position + '</td>' +
            '<td>' + (dept ? dept.name : 'N/A') + '</td>' +
            '<td>' +
                '<button class="btn-sm btn-edit" data-idx="' + idx + '">Edit</button> ' +
                '<button class="btn-sm btn-danger" data-idx="' + idx + '">Delete</button>' +
            '</td>';
        tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.btn-edit').forEach(function(btn) {
        btn.addEventListener('click', function() {
            editEmployee(Number(btn.getAttribute('data-idx')));
        });
    });
    tbody.querySelectorAll('.btn-danger').forEach(function(btn) {
        btn.addEventListener('click', function() {
            deleteEmployee(Number(btn.getAttribute('data-idx')));
        });
    });

    populateDeptDropdown();
}

function populateDeptDropdown() {
    var select = document.getElementById('empDept');
    select.innerHTML = '<option value="">Select Department</option>';
    window.db.departments.forEach(function(d) {
        var opt = document.createElement('option');
        opt.value = d.id;
        opt.textContent = d.name;
        select.appendChild(opt);
    });
}

function showEmployeeForm(emp) {
    document.getElementById('employeeForm').style.display = 'block';
    populateDeptDropdown();

    if (emp !== undefined && emp !== null) {
        var idx = window.db.employees.indexOf(emp);
        editingEmployeeIdx = idx;
        document.getElementById('empId').value = emp.employeeId;
        document.getElementById('empEmail').value = emp.email;
        document.getElementById('empPosition').value = emp.position;
        document.getElementById('empDept').value = emp.deptId;
        document.getElementById('empHireDate').value = emp.hireDate || '';
    } else {
        editingEmployeeIdx = null;
        document.getElementById('empId').value = '';
        document.getElementById('empEmail').value = '';
        document.getElementById('empPosition').value = '';
        document.getElementById('empDept').value = '';
        document.getElementById('empHireDate').value = '';
    }
}

function hideEmployeeForm() {
    document.getElementById('employeeForm').style.display = 'none';
    editingEmployeeIdx = null;
}

function saveEmployee() {
    var employeeId = document.getElementById('empId').value.trim();
    var email = document.getElementById('empEmail').value.trim();
    var position = document.getElementById('empPosition').value.trim();
    var deptId = Number(document.getElementById('empDept').value);
    var hireDate = document.getElementById('empHireDate').value;

    if (!employeeId || !email || !position || !deptId) {
        showToast('Please fill in all fields', 'error');
        return;
    }

    var account = window.db.accounts.find(function(a) { return a.email === email; });
    if (!account) {
        showToast('No account with that email exists', 'error');
        return;
    }

    var empData = {
        employeeId: employeeId,
        email: email,
        userId: account.id,
        position: position,
        deptId: deptId,
        hireDate: hireDate
    };

    if (editingEmployeeIdx !== null) {
        window.db.employees[editingEmployeeIdx] = empData;
        showToast('Employee updated', 'success');
    } else {
        window.db.employees.push(empData);
        showToast('Employee added', 'success');
    }

    saveToStorage();
    hideEmployeeForm();
    renderEmployeesTable();
}

function editEmployee(idx) {
    var emp = window.db.employees[idx];
    if (emp) showEmployeeForm(emp);
}

function deleteEmployee(idx) {
    if (confirm('Delete this employee?')) {
        window.db.employees.splice(idx, 1);
        saveToStorage();
        showToast('Employee deleted', 'success');
        renderEmployeesTable();
    }
}

function renderRequestsList() {
    var container = document.getElementById('requestsContent');
    container.innerHTML = '';

    if (!currentUser) return;

    var isAdmin = currentUser.role === 'Admin';
    var userRequests;
    
    if (isAdmin) {
        userRequests = window.db.requests;
    } else {
        userRequests = window.db.requests.filter(function(r) {
            return r.employeeEmail === currentUser.email;
        });
    }

    if (userRequests.length === 0) {
        container.innerHTML = '<p>No requests found.' + (isAdmin ? '' : ' Click "+ New Request" to create one.') + '</p>';
        return;
    }

    var table = document.createElement('table');
    var headerHtml = '<thead><tr>' +
            '<th>Date</th><th>Type</th><th>Items</th><th>Status</th>';
    if (isAdmin) {
        headerHtml += '<th>Employee Email</th><th>Actions</th>';
    }
    headerHtml += '</tr></thead>';
    table.innerHTML = headerHtml;
    var tbody = document.createElement('tbody');

    userRequests.forEach(function(req) {
        var tr = document.createElement('tr');
        var itemsList = req.items.map(function(i) { return i.name + ' (x' + i.qty + ')'; }).join(', ');
        var badgeClass = 'badge-warning';
        if (req.status === 'Approved') badgeClass = 'badge-success';
        if (req.status === 'Rejected') badgeClass = 'badge-danger';

        var rowHtml = '<td>' + req.date + '</td>' +
            '<td>' + req.type + '</td>' +
            '<td>' + itemsList + '</td>' +
            '<td><span class="badge ' + badgeClass + '">' + req.status + '</span></td>';

        if (isAdmin) {
            rowHtml += '<td>' + req.employeeEmail + '</td>';
            var actionsHtml = '';
            if (req.status === 'Pending') {
                actionsHtml = '<button class="btn-sm btn-success approve-btn" data-req-id="' + req.id + '">Approve</button>' +
                              '<button class="btn-sm btn-danger reject-btn" data-req-id="' + req.id + '">Reject</button>';
            }
            rowHtml += '<td>' + actionsHtml + '</td>';
        }

        tr.innerHTML = rowHtml;
        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    container.appendChild(table);

    if (isAdmin) {
        tbody.querySelectorAll('.approve-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var reqId = Number(btn.getAttribute('data-req-id'));
                approveRequest(reqId);
            });
        });

        tbody.querySelectorAll('.reject-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var reqId = Number(btn.getAttribute('data-req-id'));
                rejectRequest(reqId);
            });
        });
    }
}

function approveRequest(reqId) {
    var request = window.db.requests.find(function(r) { return r.id === reqId; });
    if (request) {
        request.status = 'Approved';
        saveToStorage();
        renderRequestsList();
        showToast('Request approved', 'success');
    }
}

function rejectRequest(reqId) {
    var request = window.db.requests.find(function(r) { return r.id === reqId; });
    if (request) {
        request.status = 'Rejected';
        saveToStorage();
        renderRequestsList();
        showToast('Request rejected', 'error');
    }
}

function openRequestModal() {
    document.getElementById('requestModal').style.display = 'flex';
    document.getElementById('requestItems').innerHTML = '';
    addRequestItem();
}

function closeRequestModal() {
    document.getElementById('requestModal').style.display = 'none';
}

function addRequestItem() {
    var container = document.getElementById('requestItems');
    var div = document.createElement('div');
    div.className = 'request-item-row';
    div.innerHTML =
        '<input type="text" placeholder="Item name" class="req-item-name">' +
        '<input type="number" placeholder="Qty" min="1" value="1" class="req-item-qty">' +
        '<button type="button" class="btn-sm btn-danger remove-item-btn">\u00D7</button>';
    container.appendChild(div);

    div.querySelector('.remove-item-btn').addEventListener('click', function() {
        div.remove();
    });
}

function submitRequest() {
    var type = document.getElementById('requestType').value;
    var itemRows = document.querySelectorAll('#requestItems .request-item-row');
    var items = [];

    itemRows.forEach(function(row) {
        var name = row.querySelector('.req-item-name').value.trim();
        var qty = parseInt(row.querySelector('.req-item-qty').value) || 0;
        if (name && qty > 0) {
            items.push({ name: name, qty: qty });
        }
    });

    if (items.length === 0) {
        showToast('Please add at least one item', 'error');
        return;
    }

    window.db.requests.push({
        id: Date.now(),
        type: type,
        items: items,
        status: 'Pending',
        date: new Date().toISOString().split('T')[0],
        employeeEmail: currentUser.email
    });
    saveToStorage();
    closeRequestModal();
    showToast('Request submitted', 'success');
    renderRequestsList();
}

document.addEventListener('DOMContentLoaded', function() {

    loadFromStorage();

    var savedToken = localStorage.getItem('auth_token');
    if (savedToken) {
        var savedUser = window.db.accounts.find(function(a) { return a.email === savedToken; });
        if (savedUser) {
            setAuthState(true, savedUser);
        }
    }

    if (!window.location.hash || window.location.hash === '#') {
        window.location.hash = '#/';
    }
    handleRouting();

    var dropdown = document.querySelector('.dropdown');
    var toggle = document.getElementById('userDropdown');
    if (toggle) {
        toggle.addEventListener('click', function(e) {
            e.preventDefault();
            dropdown.classList.toggle('open');
        });
        document.addEventListener('click', function(e) {
            if (!dropdown.contains(e.target)) {
                dropdown.classList.remove('open');
            }
        });
    }

    document.getElementById('registerForm').addEventListener('submit', function(e) {
        e.preventDefault();
        handleRegistration();
    });

    document.getElementById('simulateVerifyBtn').addEventListener('click', simulateEmailVerification);

    document.getElementById('loginForm').addEventListener('submit', function(e) {
        e.preventDefault();
        handleLogin();
    });

    document.getElementById('logoutBtn').addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        handleLogout();
    });

    document.getElementById('addAccountBtn').addEventListener('click', function() { showAccountForm(null); });
    document.getElementById('saveAccountBtn').addEventListener('click', saveAccount);
    document.getElementById('cancelAccountBtn').addEventListener('click', hideAccountForm);

    document.getElementById('addDeptBtn').addEventListener('click', addDepartment);
    document.getElementById('saveDeptBtn').addEventListener('click', saveDept);
    document.getElementById('cancelDeptBtn').addEventListener('click', hideDeptForm);

    document.getElementById('addEmployeeBtn').addEventListener('click', function() { showEmployeeForm(null); });
    document.getElementById('saveEmployeeBtn').addEventListener('click', saveEmployee);
    document.getElementById('cancelEmployeeBtn').addEventListener('click', hideEmployeeForm);

    document.getElementById('newRequestBtn').addEventListener('click', openRequestModal);
    document.getElementById('closeRequestModal').addEventListener('click', closeRequestModal);
    document.getElementById('addRequestItemBtn').addEventListener('click', addRequestItem);
    document.getElementById('submitRequestBtn').addEventListener('click', submitRequest);

    document.addEventListener('click', function () {
        const toastContainer = document.getElementById('toastContainer');
        if (toastContainer) {
            toastContainer.innerHTML = '';
        }
    });
});